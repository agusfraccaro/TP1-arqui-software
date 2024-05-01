import {nanoid} from 'nanoid';
import express from 'express';
import axios from 'axios';
import redis from 'redis';
import { Metrics } from './metrics.js';

//Const
const errorMessages = {
    dependencyError: 'Error communicating with the dependency API.',
    internalError: 'Internal Server Error.'
};

// Init
const app = express();
const redisClient = redis.createClient({
    host: 'redis',
    port: 6379
});

const id = nanoid();
const metricsClient = new Metrics() ;

// Middleware
app.use((req, res, next) => {
    const start = Date.now();
    const endpoint = req.path;
    res.setHeader('X-API-Id', id);

    metricsClient.send_request_received_metric(endpoint);
    res.on('finish', () => {
        metricsClient.send_endpoint_total_time(endpoint, start);
    });
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
        if (cached === "true") {
            const cachedData = await getDataFromRedis(word);
            if (cachedData) {
                await metricsClient.send_cache_hit_metric();
                console.log(`Data was gathered from the cache for word: ${word}`);
                return res.status(200).send(JSON.parse(cachedData));
            }
        }
        const response = await metricsClient.measure_dependency(req.path, async () => {
            return await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        });
        const { phonetics, meanings } = response.data[0];
        try {
            console.log(`Saving word on cache: ${word}`);
            await redisClient.setex(word, 5, JSON.stringify({ phonetics, meanings }));
        } catch (error) {
            console.log(`Error on setting redis value ${error}`);
        }
        
        console.log(`Data was gathered from the service for word: ${word}`);

        res.status(200).send({ phonetics, meanings });
    } catch(error){
        handleError(res, error);
    }
});

app.get('/spaceflight_news', async (req, res) => {
    const start = Date.now();

    const {cached} = req.query;

    try {
        // Get cached data
        if (cached === "true") {
            const cachedData = await getDataFromRedis('spaceflight news');
            if (cachedData) {
                await metricsClient.send_cache_hit_metric();
                console.log(`Data was gathered from the cache for news`);
                return res.status(200).send(JSON.parse(cachedData));
            }
        }
        const response = await metricsClient.measure_dependency(req.path, async () => {
            return await axios.get('https://api.spaceflightnewsapi.net/v4/articles', {
                params: {
                    limit: 5
                }
            });
        });

        let titles = [];

        response.data.results.forEach(article => {
            if (article.hasOwnProperty('title')) {
                titles.push(article.title);
            }
        });

        console.log('Data was gathered from the service for spaceflight news');
        try {
            console.log('Saving news on cache');
            // Save for 5 mins
            await redisClient.setex('spaceflight news', 5 * 60, JSON.stringify(titles));
        } catch (error) {
            console.log(`Error on setting redis value of spaceflight news`);
        }

        res.status(200).send(titles);
    } catch(error){
        handleError(res, error);
    }
    
});

app.get('/quote', async (req, res) => {
    const start = Date.now();

    try {
        const response = await metricsClient.measure_dependency(req.path, async () => {
            return await axios.get('https://api.quotable.io/random');
        });

        const { content, author } = response.data;

        res.status(200).send({ content, author });
    } catch(error){
        handleError(res, error);
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

function handleError(res, error) {
    console.log(error);
    if (error.response) {
        console.log(`HTTP Error: ${error.response.status} - ${error.response.statusText}`);
        console.log('Response Data:', error.response.data);
        res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
        // 424 failed dependency
        console.log('Failed dependency error:', error.request);
        res.status(424).send(errorMessages.dependencyError);
    } else {
        console.log('Internal Error:', error.message);
        res.status(500).send(errorMessages.internalError);
    }
}

app.listen(3000, console.log("Listening on port 3000"));