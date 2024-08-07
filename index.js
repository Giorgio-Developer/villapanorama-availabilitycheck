const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const GoogleCalendar = require('./GoogleCalendar');
const BookingHelper = require('./BookingHelper'); // Importa la classe BookingHelper
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/assets', express.static(path.join(__dirname, 'assets'))); // Servire i file statici dalla cartella assets

const googleCalendar = new GoogleCalendar();

// Array associativo per mappare gli ID dei calendari ai nomi delle stanze
const roomsNames = {
    "hm24qf24l1v16fqg8iv9sgbnt1s7ctm5@import.calendar.google.com": "Villa Panorama",
    "ipdt2erdd6eoriaukuae2vv0c22fsba8@import.calendar.google.com": "Elettra",
    "1uo0g04eif8o44c4mcn8dlufim485l0l@import.calendar.google.com": "Calypso",
    "htbraiua1erp01qpo1g46nsn8bsibcuq@import.calendar.google.com": "Hermes",
    "ceph5hop46teenje89bt5g2pbr70td9g@import.calendar.google.com": "Demetra",
    "tqscm1ioj0n52vdda1bjsvsms019tkq3@import.calendar.google.com": "Iris Oasis",
};

const roomsImages = {
    "hm24qf24l1v16fqg8iv9sgbnt1s7ctm5@import.calendar.google.com": "Villa_Panorama_Suite.jpg",
    "ipdt2erdd6eoriaukuae2vv0c22fsba8@import.calendar.google.com": "Elettra.jpg",
    "1uo0g04eif8o44c4mcn8dlufim485l0l@import.calendar.google.com": "Calypso.jpeg",
    "htbraiua1erp01qpo1g46nsn8bsibcuq@import.calendar.google.com": "Hermes.jpg",
    "ceph5hop46teenje89bt5g2pbr70td9g@import.calendar.google.com": "Demetra.jpg",
    "tqscm1ioj0n52vdda1bjsvsms019tkq3@import.calendar.google.com": "IrisOasis.jpg",
};


const translations_it = {
    "Disponibilità Villa Panorama": "Disponibilità Villa Panorama",
    "Costo totale per il periodo selezionato:": "Costo totale per il periodo selezionato:",
    "Camere disponibili nel periodo selezionato": "Camere disponibili nel periodo selezionato",
    "Nessuno dei calendari è disponibile nel periodo selezionato.": "Nessuno dei calendari è disponibile nel periodo selezionato.",
    "Periodi alternativi disponibili" : "Periodi alternativi disponibili:",
    "Richiesta prenotazione": "Richiesta prenotazione",
    "Nessuna Suite disponibile per l'intero periodo selezionato": "Nessuna Suite disponibile per l'intero periodo selezionato",
    "Seleziona": "Seleziona"
};

const translations_en = {
    "Disponibilità Villa Panorama": "Villa Panorama Availability",
    "Costo totale per il periodo selezionato:": "Total cost for the selected period",
    "Camere disponibili nel periodo selezionato": "Rooms available in the selected period",
    "Nessuno dei calendari è disponibile nel periodo selezionato.": "None of the calendars are available in the selected period.",
    "Periodi alternativi disponibili" : "Alternative periods available:",
    "Richiesta prenotazione": "Booking request",
    "Nessuna Suite disponibile per l'intero periodo selezionato": "No Suite available for the entire selected period",
    "Seleziona": "Choose"
};
  
const translations_fr = {
    "Disponibilità Villa Panorama": "Disponibilité Villa Panorama",
    "Costo totale per il periodo selezionato:": "Coût total pour la période sélectionnée",
    "Camere disponibili nel periodo selezionato": "Chambres disponibles dans la période sélectionnée",
    "Nessuno dei calendari è disponibile nel periodo selezionato.": "Aucun des calendriers n'est disponible dans la période sélectionnée.",
    "Periodi alternativi disponibili" : "Périodes alternatives disponibles:",
    "Richiesta prenotazione": "Demande de réservation",
    "Nessuna Suite disponibile per l'intero periodo selezionato": "Aucune suite disponible pour toute la période sélectionnée",
    "Seleziona": "Choisir"
};

const translations_de = {
    "Disponibilità Villa Panorama": "Villa Panorama Verfügbarkeit",
    "Costo totale per il periodo selezionato:": "Gesamtkosten für den ausgewählten Zeitraum",
    "Camere disponibili nel periodo selezionato": "Zimmer verfügbar im ausgewählten Zeitraum",
    "Nessuno dei calendari è disponibile nel periodo selezionato.": "Keiner der Kalender ist im ausgewählten Zeitraum verfügbar.",
    "Periodi alternativi disponibili" : "Alternative Zeiträume verfügbar:",
    "Richiesta prenotazione": "Buchungsanfrage",
    "Nessuna Suite disponibile per l'intero periodo selezionato": "Keine Suite für den gesamten ausgewählten Zeitraum verfügbar",
    "Seleziona": "Wählen"
};

const translations = {
    "it": translations_it,
    "en": translations_en,
    "fr": translations_fr,
    "de": translations_de
};

// Funzione per tradurre il testo in base alla lingua
function translateText(text, lang = "en") {

    if (translations[lang] && translations[lang][text]) {
        return translations[lang][text];
    }
    return text;
}



const htmlResponsePostfix = `
            <div class="form-group col-md-3">
                &nbsp;
            </div>
        </div>

        <!-- Bootstrap JS and dependencies -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.slim.min.js"></script>
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.16.0/umd/popper.min.js"></script>

        </body>
    </html>
`;

// Servire la pagina HTML
app.get('/', async (req, res) => {
    try {
        const oAuth2Client = await googleCalendar.authorize();
        const token = oAuth2Client.credentials;
        if (token && token.access_token) {
            res.sendFile(path.join(__dirname, 'disponibilita.html'));
        } else {
            res.sendFile(path.join(__dirname, 'index.html'));
        }
    } catch (error) {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// Verifica se il token esiste
app.get('/check-token', async (req, res) => {
    try {
        if (fs.existsSync(path.join(__dirname, 'token.json'))) {
            res.json({ hasToken: true });
        } else {
            res.json({ hasToken: false });
        }
    } catch (error) {
        console.error('Error checking token:', error);
        res.status(500).json({ error: 'Error checking token' });
    }
});

// Endpoint per generare l'URL di autorizzazione
app.get('/auth-url', async (req, res) => {
    try {
        await googleCalendar.loadCredentials();
        const authUrl = googleCalendar.generateAuthUrl();
        res.send({ url: authUrl });
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).send('Error generating auth URL');
    }
});

// Endpoint per gestire la pagina di callback OAuth2
app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    try {
        const oAuth2Client = await googleCalendar.authorize();
        await googleCalendar.getAccessToken(oAuth2Client, code);
        res.sendFile(path.join(__dirname, 'oauth2callback.html'));
    } catch (error) {
        console.error('Error during OAuth2 callback:', error);
        res.status(500).send('Error during OAuth2 callback');
    }
});

// Endpoint per gestire il form di callback e filtrare gli eventi
app.post('/events', async (req, res) => {
    try {
        const { calendarIds, timeMin, timeMax } = req.body;
        const oAuth2Client = await googleCalendar.authorize();
        const events = [];
        for (const calendarId of calendarIds) {
            const calendarEvents = await googleCalendar.listEvents(oAuth2Client, calendarId, timeMin, timeMax);
            events.push(...calendarEvents);
        }
        res.send(events);
    } catch (error) {
        console.error('Error listing events:', error);
        res.status(500).send('Error listing events');
    }
});

app.post('/freebusy', async (req, res) => {

    let wordpressBaseUrl = 'https://villapanoramasuite.it/booking-engine-reservation-form'; // Sostituisci con l'URL effettivo della tua pagina WordPress

    const id_villa_panorama = "hm24qf24l1v16fqg8iv9sgbnt1s7ctm5@import.calendar.google.com";
    const id_calypso = "1uo0g04eif8o44c4mcn8dlufim485l0l@import.calendar.google.com";

    try {
        const oAuth2Client = await googleCalendar.authorize();
        // let { calendarIds, timeMin, timeMax, adults, children, pets, lang } = req.body;
        let { calendarIds, timeMin, timeMax, adults, children, pets } = req.body;


        // Prendi l'header 'Accept-Language' e scegli la prima lingua
        let lang = req.headers['accept-language'];
        if (lang) {
            lang = lang.split(',')[0].split('-')[0]; // Restituisce solo il codice della lingua principale, es. 'en' da 'en-US,en;q=0.9'
        } else {
            lang = 'it'; // Imposta un valore di default se l'header non è disponibile
        }


        // Se lang è una delle lingue supportate, usa quella, altrimenti usa 'en' 
        if(lang != "" && lang != "it") {
            if(lang == "en" || lang == "fr" || lang == "de") {
                wordpressBaseUrl = wordpressBaseUrl + '-' + lang+"/";
            } else {
                wordpressBaseUrl = wordpressBaseUrl + "en/";
            }
        } else {
            wordpressBaseUrl = wordpressBaseUrl + "/";
        }

        var htmlResponsePrefix = `
        <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>`+translateText("Disponibilità Villa Panorama", lang)+`</title>
                <!-- Bootstrap CSS -->
                <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
                <link rel="stylesheet" href="assets/css/style.css">
            </head>
            <body class="container mt-5 body_bg">
                <div class="header" style="padding-top: 50px;">
                    <button onclick="window.history.back()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>
                        </svg>
                    </button>
                    <p>
                        <h4 style="
                            margin-top: 20px; 
                            padding: 10px 20px; 
                            background-color: #007BFF; 
                            color: white; 
                            border-radius: 5px; 
                            background-color: #11223355; 
                            border: 1px solid lightgray;
                            ">`+translateText("Camere disponibili nel periodo selezionato", lang)+`
                        </h4>
                    </p>
                </div>
                <div class="row" style="padding-top: 50px; text-align: center;">
                    <div class="form-group col-md-3">
                        &nbsp;
                    </div>
        `;
    
        var htmlResponsePrefixNoAvail = `
            <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>`+translateText("Disponibilità Villa Panorama", lang)+`</title>
                    <!-- Bootstrap CSS -->
                    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
                    <link rel="stylesheet" href="assets/css/style.css">
                </head>
                <body class="container mt-5 body_bg">
                    <div class="header" style="padding-top: 50px;">
                        <button onclick="window.history.back()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>
                            </svg>
                        </button>
                        <p>
                            <h4  style="
                                margin-top: 20px; 
                                padding: 10px 20px; 
                                background-color: #007BFF; 
                                color: white; 
                                border-radius: 5px; 
                                background-color: #11223355; 
                                border: 1px solid lightgray;
                                ">`+translateText("Nessuna Suite disponibile per l'intero periodo selezionato", lang)+`
                            </h4>
                        </p>
                    </div>
                    <div class="row" style="padding-top: 50px; text-align: center;">
                        <div class="form-group col-md-3">
                            &nbsp;
                        </div>
        `;

        // Assicurati che calendarIds sia un array
        if (!Array.isArray(calendarIds)) {
            calendarIds = [calendarIds];
        }

        if(adults > 2) 
            calendarIds = [id_villa_panorama, id_calypso];

        const requestBody = {
            timeMin: new Date(timeMin).toISOString(),
            timeMax: new Date(timeMax).toISOString(),
            items: calendarIds.map(id => ({ id })),
            adults: parseInt(adults, 10),
            children: parseInt(children, 10),
            pets: pets,
        };

        const freeBusyResponse = await googleCalendar.checkFreeBusy(oAuth2Client, requestBody);

        // Calendari disponibili
        const availableCalendars = Object.keys(freeBusyResponse).filter(calendarId => {
            const busyTimes = freeBusyResponse[calendarId].busy;
            return busyTimes.length === 0;
        }).map(calendarId => ({
            name: roomsNames[calendarId],
            image: roomsImages[calendarId],
            calendarId: calendarId,
        }));

        if (availableCalendars.length > 0) {
            const roomCosts = await Promise.all(availableCalendars.map(async room => {
                const bookings = await BookingHelper.readCSV(`rooms_prices/${room.name}.csv`);
                const totalCost = BookingHelper.calculateTotalCostV2(bookings, timeMin, timeMax, adults, children, pets);
                return {
                    ...room,
                    totalCost
                };
            }));

            pets = formatPets(pets);

            // Modifica qui: genera l'URL di WordPress con i parametri
            const htmlResponseRoomsList = `
                <div class="form-group col-md-6">
                    ${roomCosts.length > 0 ? `
                        <ul>
                            ${roomCosts.map(room => `
                                <div class="room">
                                    <img src="/assets/images/${room.image}" alt="${room.name}">
                                    <div class="room-name">${room.name}</div>
                                    <div class="room-cost">`+translateText("Costo totale per il periodo selezionato:", lang)+` ${room.totalCost} €</div>
                                    <a href="${wordpressBaseUrl}?room=${encodeURIComponent(room.name)}&checkin=${encodeURIComponent(timeMin)}&checkout=${encodeURIComponent(timeMax)}&adults=${adults}&children=${children}&pets=${pets}&price=${room.totalCost}&lang=${lang}" class="btn btn-primary">`+translateText("Richiesta prenotazione", lang)+`</a>
                                </div>
                            `).join('')}
                        </ul>
                    ` : `
                        <p>`+translateText("Nessuno dei calendari è disponibile nel periodo selezionato.", lang)+`</p>
                    `}
                </div>
            `;
    
            const htmlResponse = htmlResponsePrefix + htmlResponseRoomsList + htmlResponsePostfix;
            res.send(htmlResponse);
        } else {
            // Trova prossime disponibilità utilizzando la risposta di checkFreeBusy
            let alternativeAvailability = [];
            for (const calendarId of calendarIds) {
                const busyPeriods = freeBusyResponse[calendarId].busy;
                const periods = await findNextAvailablePeriods(busyPeriods, timeMin, timeMax, adults, children, pets, roomsNames[calendarId]);
                if (periods.length > 0) {
                    alternativeAvailability.push({
                        calendarId: calendarId,
                        name: roomsNames[calendarId],
                        image: roomsImages[calendarId],
                        availablePeriods: periods
                    });
                }
            }

            // Costruisci risposta HTML per periodi alternativi
            const htmlAlternativeResponse = `
                <div class="form-group col-md-6">
                    <h4
                        style="
                            margin-top: 20px; 
                            padding: 10px 20px; 
                            background-color: #007BFF; 
                            color: white; 
                            border-radius: 5px; 
                            background-color: #11223355; 
                            border: 1px solid lightgray;
                    ">`+translateText("Periodi alternativi disponibili", lang)+`</h4>
                    <ul style="
                            padding-left: 0px;
                        ">
                        ${alternativeAvailability.map(room => `
                            <div class="room">
                                <img src="/assets/images/${room.image}" alt="${room.name}">
                                <div class="room-name">${room.name}</div>
                                <ul style="font-weight: 300; list-style: none; font-size: smaller;">
                                    ${room.availablePeriods.map(period => {
                                        // Qui utilizziamo convertDate per formattare le date
                                        const formattedStartDate = convertDate(period.start);
                                        const formattedEndDate = convertDate(period.end);
                                        pets = formatPets(pets);
                                        return `
                                            <li style=" justify-content: space-between; display: flex; padding-top: 8px;">
                                                <div>
                                                    [${period.start} - ${period.end}]
                                                </div> 
                                                <div>
                                                    <b>€ ${period.totalCost}</b>
                                                </div>  
                                                <div>
                                                    <a href="${wordpressBaseUrl}?room=${encodeURIComponent(room.name)}&checkin=${encodeURIComponent(formattedStartDate)}&checkout=${encodeURIComponent(formattedEndDate)}&adults=${adults}&children=${children}&pets=${pets}&price=${period.totalCost}&lang=${lang}" class="btn btn-sm btn-primary" style="font-size: smaller;">`+translateText("Seleziona", lang)+`</a>
                                                </div>
                                            </li>
                                        `;
                                    }).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </ul>
                </div>
            `;

            const htmlResponse = htmlResponsePrefixNoAvail + htmlAlternativeResponse + htmlResponsePostfix;

            res.send(htmlResponse);
        }
    } catch (error) {
        console.error('Error checking freeBusy:', error);
        res.status(500).send('Error checking freeBusy');
    }
});

async function findNextAvailablePeriods(busyPeriods, timeMin, timeMax, adults, children, pets, roomName) {
    const availablePeriods = [];

    if (busyPeriods.length === 0) {
        // Se non ci sono periodi occupati, tutto il range è disponibile
        availablePeriods.push({ start: timeMin, end: timeMax });
        return availablePeriods;
    }

    // Aggiungi disponibilità prima del primo periodo occupato
    if (new Date(busyPeriods[0].start).getTime() > new Date(timeMin).getTime()) {
        availablePeriods.push({ start: timeMin, end: busyPeriods[0].start });
    }

    // Calcola i gap tra i periodi occupati
    for (let i = 0; i < busyPeriods.length - 1; i++) {
        if (new Date(busyPeriods[i].end).getTime() < new Date(busyPeriods[i + 1].start).getTime()) {
            availablePeriods.push({ start: busyPeriods[i].end, end: busyPeriods[i + 1].start });
        }
    }

    // Aggiungi disponibilità dopo l'ultimo periodo occupato
    if (new Date(busyPeriods[busyPeriods.length - 1].end).getTime() < new Date(timeMax).getTime()) {
        availablePeriods.push({ start: busyPeriods[busyPeriods.length - 1].end, end: timeMax });
    }

    // Calcolo del costo totale per ciascun periodo disponibile
    return Promise.all(availablePeriods.map(async period => {
        const bookings = await BookingHelper.readCSV(`rooms_prices/${roomName}.csv`);
        const totalCost = BookingHelper.calculateTotalCostV2(bookings, period.start, period.end, adults, children, pets);
        return {
            start: formatDate(period.start),
            end: formatDate(period.end),
            totalCost
        };
    }));
}

function formatDate(dateIsoString) {
    const date = new Date(dateIsoString);
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // JavaScript conta i mesi da 0
    let year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function convertDate(inputDate) {
    // Assumiamo che inputDate sia una stringa nel formato "dd-mm-yyyy"
    const parts = inputDate.split('-'); // Dividiamo la stringa in parti basate sul separatore '-'
    if (parts.length !== 3) {
        throw new Error('Formato data non valido. Assicurati che sia "dd-mm-yyyy".');
    }

    const day = parts[0];
    const month = parts[1];
    const year = parts[2];

    // Restituiamo una nuova stringa nel formato "yyyy-mm-dd"
    return `${year}-${month}-${day}`;
}

function formatPets(pets) {

    // return pets;

    return (
        pets === 'si' || 
        pets === 'Si' || 
        pets === 'Sì' || 
        pets === 'sì' ||
        pets === 'yes' ||
        pets === 'Yes'
    ) ? 'Si' : 'No';
}

app.get('/calendars', async (req, res) => {
    try {
        const oAuth2Client = await googleCalendar.authorize();
        const calendars = await googleCalendar.listCalendars(oAuth2Client);
        res.send(calendars);
    } catch (error) {
        console.error('Error fetching calendars:', error);
        res.status(500).send('Error fetching calendars');
    }
});

// Avvia il server
app.listen(port, () => {
    console.log(`Server in ascolto su http://localhost:${port}`);
});
