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

    async measure_dependency(func) {
        const start = process.hrtime();
        const result = await func();
        const end = process.hrtime(start);
        const duration = end[0] * 1e3 + end[1] * 1e-6;

        this.log('dependency.time', duration);

        return result;
    }

    send_endpoint_total_time(start_time) {
        const duration = Date.now() - start_time;

        this.client.gauge(`total.time`, duration, (error) => {
            if (error) {
                console.error('Error al enviar métrica:', error);
            } else {
                console.log('Métrica enviada correctamente');
            }
            console.log(duration);
        });

        console.log(duration);
    }
}
