import pkg from 'hot-shots';
const {StatsD} = pkg;

export class Metrics {
    constructor() {
        this.client = new StatsD({
            host: 'graphite',
            port: 8125,
            prefix: 'api_metrics.',
            errorHandler: function (error) {
                console.log("Socket errors caught here: ", error);
            }
        });
        
    }

    send_gauge(metric_name, value) {
        this.client.gauge(metric_name, value);
    }

    send_timing(metric_name, value) {
        this.client.timing(metric_name, value);
    }

    send_increment(metric_name, value) {
        this.client.increment(metric_name, value);
    }

    async measure_dependency(endpoint, func) {
        const start_time = Date.now();
        const result = await func();
        const duration = Date.now() - start_time;

        this.send_gauge(`${endpoint.substring(1)}.dependency.time`, duration);
        this.send_timing(`${endpoint.substring(1)}.dependency.time`, duration);
        return result;
    }

    send_endpoint_total_time(endpoint, start_time) {
        const duration = Date.now() - start_time;

        this.send_gauge(`${endpoint.substring(1)}.total.time`, duration);
        this.send_timing(`${endpoint.substring(1)}.total.time`, duration);
    }

    send_cache_hit_metric() {
        this.send_increment('cache.hit.increment', 1);
        this.send_gauge('cache.hit', 1);
    }

    send_request_received_metric(endpoint) {
        const metric_path = `request.received.increment.${this.format_endpoint_metric(endpoint)}`;
        this.send_increment(metric_path, 1);
    }

    format_endpoint_metric(endpoint) {
        return endpoint.substring(1);
    }
}
