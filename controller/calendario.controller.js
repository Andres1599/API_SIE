const response = require('../response/response')
module.exports = (app, string) => {

    const Calendario = app.get('calendario');
    const CalendarioUsuario = app.get('calendario_usuario');
    const Actividad = app.get('catalogo_actividad')
    const Ensayo = app.get('catalogo_ensayo')
    const op = app.get('op')
    const Usuario = app.get('usuario');
    const DatosUsuario = app.get('usuario_datos');
    const CalendarioEnsayo = app.get('calendario_ensayo');

    return {
        create: (req, res) => { createEvent(req, res, string, response, Calendario, CalendarioUsuario, CalendarioEnsayo) },
        update: (req, res) => { updateEvent(req, res, string, response, Calendario) },
        delete: (req, res) => { deleteEvent(req, res, string, response, Calendario, CalendarioUsuario) },
        getAll: (req, res) => { getAllEvent(req, res, string, Calendario) },
        getById: (req, res) => { getEventById(req, res, string, response, Calendario, CalendarioUsuario, Usuario, DatosUsuario, Actividad, CalendarioEnsayo, Ensayo) },
        getUserEventsById: (req, res) => { getAllEventUserById(req, res, string, Calendario, CalendarioUsuario, CalendarioEnsayo) },
        close: (req, res) => { closeCalendar(req, res, string, Calendario) },
        search: (req, res) => { searchCalendar(req, res, string, op, Calendario, Actividad, Ensayo, CalendarioUsuario, Usuario, DatosUsuario, CalendarioEnsayo) },
        searchUser: (req, res) => { getEventToBeClosePerUser(req, res, Calendario, Actividad, Ensayo, string, op, CalendarioUsuario, Usuario, DatosUsuario, CalendarioEnsayo) },
        full: (req, res) => { fullSearchCalendar(req, res, Calendario, Actividad, Ensayo, string, op, CalendarioUsuario, Usuario, DatosUsuario) }
    }
}

async function createEvent(req, res, string, response, Calendario, CalendarioUsuario, CalendarioEnsayo) {
    try {

        const event = req.body;

        const newEvent = await Calendario.create(event, { include: [CalendarioUsuario, CalendarioEnsayo] })

        res.json(new response(true, string.create, null, newEvent))


    } catch (error) {
        res.json(new response(false, string.errCatch, error, null))
    }
}

async function deleteEvent(req, res, string, response, Calendario, CalendarioUsuario) {
    try {

        const idEvent = req.params.id

        const deleteEventUser = await CalendarioUsuario.destroy({ where: { fk_id_calendario: idEvent } })
        const deleteEvent = await Calendario.destroy({ where: { id: idEvent } })

        res.json(new response(true, string.delete, null, deleteEvent));

    } catch (error) {
        res.json(new response(false, string.errCatch, error, null));
    }
}

async function updateEvent(req, res, string, response, Calendario) {
    try {

        const event = req.body;

        const updateEvent = await Calendario.update({
            title: event.title,
            start: event.start,
            end: event.end,
            client: event.client,
            noOrder: event.noOrder,
            fk_id_actividad: event.fk_id_actividad
        }, {
            where: {
                id: req.body.id
            }
        })

        res.json(new response(true, string.update, null, updateEvent))

    } catch (error) {
        res.json(new response(false, string.errCatch, error, null))
    }
}

function getAllEvent(req, res, string, Calendario) {
    Calendario.findAll().then(events => {
        res.json(events)
    }).catch(err => {
        res.json(new response(false, string.errCatch, err, null));
    })
}

async function getEventById(req, res, string, response, Calendario, CalendarioUsuario, Usuario, DatosUsuario, Actividad, CalendarioEnsayo, Ensayo) {
    try {
        const event = await Calendario.findByPk(req.params.id, {
            include: [
                {
                    model: CalendarioUsuario,
                    include: [{ model: Usuario, attributes: ['id_usuario'], include: [{ model: DatosUsuario, attributes: ['nombre', 'apellido'] }] }]
                },
                Actividad,
                {
                    model: CalendarioEnsayo,
                    include: [Ensayo]
                }
            ]
        })

        res.json(new response(true, string.get, null, event));

    } catch (error) {
        res.json(new response(false, string.errCatch, error, null));
    }
}

function getAllEventUserById(req, res, string, Calendario, CalendarioUsuario) {
    CalendarioUsuario.findAll({
        where: {
            fk_id_usuario: req.params.fk_id_usuario,
            statusAccept: true,
            cierre_calendario: true
        },
        include: [Calendario]
    }).then(events => {
        res.json(events)
    }).catch(err => {
        res.json(new response(false, string.errCatch, err, null));
    })
}

async function closeCalendar(req, res, string, Calendario) {
    try {
        let events = req.body.activities;
        if (Array.isArray(events)) {

            for await (item of events) {
                const updateEvent = await Calendario.update({ status: true }, {
                    where: { id: item.fk_id_calendario }
                })
            }

            res.json(new response(true, string.update, null, true))

        } else {
            res.json(new response(false, string.updateErr, null, null))
        }
    } catch (error) {
        res.json(new response(false, string.errCatch, err, null));
    }
}

async function searchCalendar(req, res, string, sequelize, Calendario, Actividad, Ensayo, CalendarioUsuario, Usuario, DatosUsuario, CalendarioEnsayo) {
    try {
        const Op = sequelize.Op
        const where = {
            start: req.body.start,
            end: req.body.end,
            id_actividad: req.body.id_actividad,
            id_usuario: req.body.id_usuario
        }
        const eventSearch = await Calendario.findAll({
            where: {
                [Op.or]: {
                    end: {
                        [Op.between]: [where.start, where.end]
                    },
                    start: {
                        [Op.between]: [where.start, where.end]
                    }
                },
                fk_id_actividad: where.id_actividad,
            },
            include: [
                Actividad,
                { model: CalendarioEnsayo, include: [Ensayo] },
                {
                    model: CalendarioUsuario,
                    where: { fk_id_usuario: where.id_usuario },
                    model: CalendarioUsuario,
                    include: [{ model: Usuario, attributes: ['id_usuario'], include: [{ model: DatosUsuario, attributes: ['nombre', 'apellido'] }] }],
                }
            ]

        })
        res.json(new response(true, string.getAll, null, eventSearch))
    } catch (error) {
        console.log(error)
        res.json(new response(false, string.errCatch, error, null))
    }
}

async function getEventToBeClosePerUser(req, res, Calendario, Actividad, Ensayo, string, op, CalendarioUsuario, Usuario, DatosUsuario, CalendarioEnsayo) {
    try {
        const Op = op.Op
        const events = await CalendarioUsuario.findAll({
            where: {
                fk_id_usuario: req.body.fk_id_usuario,
                statusAccept: true,
                cierre_calendario: true,
            },
            include: [{
                model: Calendario,
                where: {
                    [Op.or]: [
                        { end: { [Op.between]: [req.body.start, req.body.end] } },
                        { start: { [Op.between]: [req.body.start, req.body.end] } },
                    ],
                    fk_id_actividad: req.body.fk_id_actividad,
                    status: false
                },
                include: [
                    Actividad,
                    { model: CalendarioEnsayo, include: [Ensayo] },
                    {
                        model: CalendarioUsuario,
                        include: [{ model: Usuario, attributes: ['id_usuario'], include: [{ model: DatosUsuario, attributes: ['nombre', 'apellido'] }] }],
                    }
                ]
            }]
        })

        res.json(new response(true, string.getAll, null, events))

    } catch (error) {
        res.json(new response(false, string.errCatch, error, null))
    }
}

function fullSearchCalendar(req, res, Calendario, Actividad, Ensayo, string, op, CalendarioUsuario, Usuario, DatosUsuario) {
    const Op = op.Op
    Calendario.findAll({
        where: {
            [Op.or]: {
                end: {
                    [Op.between]: [req.body.start, req.body.end]
                },
                start: {
                    [Op.between]: [req.body.start, req.body.end]
                }
            }
        },
        include: [{
            model: Actividad
        },
        {
            model: Ensayo
        },
        {
            model: CalendarioUsuario,
            include: [
                {
                    model: Usuario,
                    attributes: ['id_usuario'],
                    include: [
                        {
                            model: DatosUsuario,
                            attributes: ['nombre', 'apellido']
                        }
                    ]
                }
            ]
        },
        ]
    }).then((events) => {
        if (events) {
            res.json(new response(true, string.getAll, null, events))
        } else {
            res.json(new response(false, string.getErr, null, events))
        }
    }).catch((err) => {
        console.error(err);
        res.json(new response(false, string.errCatch, err, null));
    })
}

