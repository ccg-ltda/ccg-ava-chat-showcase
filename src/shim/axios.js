/** `axios` stand-in: same call shape, answered by the in-browser mock server. No network. */
import { mock } from '../mock/server';

async function request(method, url, data, config = {}) {
    const params = config.params && Object.keys(config.params).length ? `${url.includes('?') ? '&' : '?'}${new URLSearchParams(config.params)}` : '';
    const { status, json } = mock.api(method, String(url) + params, data);
    const response = { data: json, status, statusText: String(status), headers: {}, config };
    if (status >= 400) { const error = new Error(`Request failed with status code ${status}`); error.response = response; throw error; }
    return response;
}

const axios = {
    defaults: { headers: { common: {} }, withCredentials: true },
    get: (url, config) => request('get', url, undefined, config),
    delete: (url, config) => request('delete', url, undefined, config),
    post: (url, data, config) => request('post', url, data, config),
    put: (url, data, config) => request('put', url, data, config),
    patch: (url, data, config) => request('patch', url, data, config),
    isAxiosError: (e) => Boolean(e?.response),
    isCancel: () => false,
    CancelToken: { source: () => ({ token: {}, cancel: () => {} }) },
};
export default axios;
