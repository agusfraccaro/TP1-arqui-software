import {nanoid} from 'nanoid';
import express from 'express';
import axios from 'axios';

const app = express();

const id = nanoid();

app.use((req, res, next) => {
    res.setHeader('X-API-Id', id);
    next();
});

app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

app.get('/dictionary', async (req, res) => {
    const {word} = req.query;
    if (!word) {
        return res.status(400).send('Missing word query param');
    }

    try {
        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);

        const { phonetics, meanings } = response.data[0];
            
        res.status(200).send({ phonetics, meanings });
    } catch(error){
        res.status(500).send('Error');
    }
});

app.get('/spaceflight_news', async (req, res) => {
    try {
        const response = await axios.get('https://api.spaceflightnewsapi.net/v4/articles?limit=5');
        let titles = [];

        response.data.results.forEach(article => {
            if (article.hasOwnProperty('title')) {
                titles.push(article.title);
            }
        });

        res.status(200).send(titles);
    } catch(error){
        res.status(500).send('Error');
    }
    
});

app.get('/quote', async (req, res) => {
    try {
        const response = await axios.get('https://api.quotable.io/random');

        const { content, author } = response.data;
            
        res.status(200).send({ content, author });
    } catch(error){
        res.status(500).send('Error');
    }
});

app.listen(3000, console.log("Escuchando en puerto 3000"));