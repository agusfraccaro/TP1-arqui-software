import pkg from 'hot-shots';
const {StatsD} = pkg;

export class TimeMetrics {
    constructor(endpoint) {
        this.client = new StatsD({
            host: 'graphite',
            port: 8125,
            prefix: 'api_metrics.' + endpoint + '.'
        });
    }

    log(metric_name, value) {
        this.client.gauge(metric_name, value);
    }

    async measure(func) {
        const start = process.hrtime();
        const result = await func();
        const end = process.hrtime(start);
        const duration = end[0] * 1e3 + end[1] * 1e-6;

        this.log('time', duration);

        return result;
    }
}
