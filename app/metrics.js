import pkg from 'hot-shots';
const {StatsD} = pkg;

export class Metrics {
    constructor() {
        this.client = new StatsD({
            host: 'graphite',
            port: 8125,
            prefix: 'api_metrics.'
        });
    }

    log(metric_name, value) {
        this.client.gauge(metric_name, value);
    }

    async measure_dependency(endpoint, func) {
        const start = process.hrtime();
        const result = await func();
        const end = process.hrtime(start);
        const duration = end[0] * 1e3 + end[1] * 1e-6;

        this.log(`${endpoint}.dependency.time`, duration);
        console.log(`Dependency duration ${duration}`)
        return result;
    }

    send_endpoint_total_time(endpoint, start_time) {
        const duration = Date.now() - start_time;

        this.log(`${endpoint}.total.time`, duration);
        console.log(`Total duration ${duration}`)
    }

    send_cache_hit_metric() {
        this.log('cache.hit', 1)
    }
}
