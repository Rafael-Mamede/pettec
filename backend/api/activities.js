const moment = require('moment')
const { NOTIFICATION_EMAIL } = require('../.env')
const {mailOption, sendEmail} = require('../config/nodemailer')

module.exports = app => {
    const { existsOrError } = app.api.validations

    const save = async (req, res) => {
        const activity = { ...req.body }
        if(req.params.id) activity.id = req.params.id

        try {
            existsOrError(activity.name, 'Nome não informado!')
            existsOrError(activity.description, 'Descrição não informada!')
            existsOrError(activity.content, 'Conteúdo da atividade não informado!')
            existsOrError(activity.userId, 'Autor da postagem não informado!')
            const sendNotification =  activity.sendNotification
            delete activity.sendNotification

            activity.postAt = moment()

            // search in the bank the people that want to receive the notices in their emails
            const peopleFromDB = await app.db('emails')
            const emails = peopleFromDB.map(person => person.email)
    
            const emailTo = emails
            const emailHtml = `<h2>${activity.name}</h2>
                               <h4>${activity.description}</h4><hr>
                               <p>Entre no site do PETTEC para visualizar o conteúdo!</p>
                               <p>Este é um e-email automático, não é necessário respondê-lo.</p>`
    
            if(activity.id) {
                const emailSubject = 'Tópico modificado - PETTEC'
                const mailOptions = mailOption(NOTIFICATION_EMAIL, emailTo, emailSubject, emailHtml )
    
                app.db('activities')
                    .update(activity)
                    .where({ id: activity.id })
                    .then(() => {
                        if(sendNotification) sendEmail(mailOptions)
                        return res.status(204).send()
                    })
                    .catch(err => res.status(500).send(err))
            } else {
                const emailSubject = 'Novo tópico - PETTEC'
                const mailOptions = mailOption(NOTIFICATION_EMAIL, emailTo, emailSubject, emailHtml )
    
                app.db('activities')
                    .insert(activity)
                    .then(() => {
                        if(sendNotification) sendEmail(mailOptions)
                        return res.status(204).send()
                    })
                    .catch(err => res.status(500).send(err))
            }

        } catch(msg) {
            res.status(400).send(msg)
        }
    }

    // function used to get the activities that will apear in the main page "/"
    const limitMainPage = 3
    const get = async (req, res) => {
        const page = req.query.page || 1

        const result = await app.db('activities').count('id').first()
        const count = parseInt(result.count)

        app.db('activities')
            .select('id', 'name', 'description', 'imageUrl')
            .limit(limitMainPage).offset(page * limitMainPage - limitMainPage)
            .orderBy('id', 'desc')
            .then(activities =>  res.json({ data:activities, count, limitMainPage }))
            .catch(err => res.status(500).send(err))
    }

    // function used to get the activities that will apear in the user page "/user"
    const limitUserPage = 8
    const getFromUser = async (req, res) => {
        const page = req.query.page || 1

        const result = await app.db('activities').count('id').first()
        const count = parseInt(result.count)

        app.db('activities')
            .select('id', 'name', 'description', 'imageUrl')
            .limit(limitUserPage).offset(page * limitUserPage - limitUserPage)
            .orderBy('id', 'desc')
            .then(activities =>  res.json({ data:activities, count, limitUserPage }))
            .catch(err => res.status(500).send(err))
    }

    const getById = (req, res) => {
        app.db('activities')
            .where({ id: req.params.id })
            .first()
            .then(activity => {
                activity.content = activity.content.toString()
                return res.json(activity)
            })
            .catch(err => res.status(500).send(err))
    }

    const search = (req, res) => {
        app.db('activities')
            .select('id', 'name', 'description')
            .orderBy('id', 'desc')
            .then(activities => res.json(activities))
            .catch(err => res.status(500).send(err))
    }

    const remove = async (req, res) => {
        try {
            const rowsDeleted = await app.db('activities')
                .where({ id: req.params.id }).del()

            try {
                existsOrError(rowsDeleted, 'Atividade não encontrada!')
            } catch(msg) {
                return res.status(400).send(msg)
            }
            res.status(204).send()
        } catch(msg) {
            res.status(500).send(msg)
        }
    }

    return { save, get, getFromUser, getById, search, remove }
}