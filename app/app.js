import {nanoid} from 'nanoid';
import express from 'express';
import axios from 'axios';
import redis from 'redis'

const app = express();
const redisClient = redis.createClient({
    host: 'redis',
    port: 6379
});

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
    const {cached} = req.query;
    if (!word) {
        return res.status(400).send('Missing word query param');
    }

    try {
        // Get cached data
        if (cached == "true") {
            const cachedData = await getDataFromRedis(word);
            if (cachedData) {
                console.log(`Data was gathered from the cache for word: ${word}`)
                return res.status(200).send(JSON.parse(cachedData));
            }
        }
        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const { phonetics, meanings } = response.data[0];
        try {
            console.log(`Saving word on cache: ${word}`)
            await redisClient.setex(word, 60, JSON.stringify({ phonetics, meanings }))
        } catch (error) {
            console.log(`Error on setting redis value ${error}`)
        }
        
        console.log(`Data was gathered from the service for word: ${word}`)
        res.status(200).send({ phonetics, meanings });
    } catch(error){
        res.status(500).send(`Error ${error}`);
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

function getDataFromRedis(key) {
    return new Promise((resolve, reject) => {
        redisClient.get(key, (err, data) => {
            if (err) {
                console.error('Error getting data from Redis:', err);
                reject(err); 
            } else {
                resolve(data);
            }
        });
    });
}

app.listen(3000, console.log("Escuchando en puerto 3000"));