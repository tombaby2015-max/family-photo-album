// api.js — связь сайта с сервером (новая версия)
// Работает с Telegram ID вместо старых f1, f2, p1, p2

var API_BASE = 'https://photo-backend.help-baby2015.workers.dev';

var api = {
    // Получаем токен из памяти браузера
    getToken: function() {
        return localStorage.getItem('admin_token');
    },

    // Проверяем, вошли ли мы как админ
    isAdmin: function() {
        return !!this.getToken();
    },

    // Сохраняем токен
    setToken: function(token) {
        localStorage.setItem('admin_token', token);
    },

    // Удаляем токен (выход)
    clearToken: function() {
        localStorage.removeItem('admin_token');
    },

    // Заголовки для запросов
    getHeaders: function(isAdmin) {
        var headers = {
            'Content-Type': 'application/json'
        };
        if (isAdmin && this.getToken()) {
            headers['Authorization'] = 'Bearer ' + this.getToken();
        }
        return headers;
    },

    // === ВХОД В АДМИНКУ ===
    login: function(password) {
        var self = this;
        return fetch(API_BASE + '/admin/login', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ password: password })
        }).then(function(response) {
            return response.json();
        }).then(function(data) {
            if (data.token) {
                self.setToken(data.token);
                return { success: true };
            }
            return { success: false, error: data.error || 'Неверный пароль' };
        }).catch(function(error) {
            return { success: false, error: 'Ошибка соединения' };
        });
    },

    logout: function() {
        this.clearToken();
    },

    // === ПАПКИ ===
    
    // Получить список папок
    getFolders: function() {
        return fetch(API_BASE + '/folders', {
            headers: this.getHeaders(this.isAdmin())
        })
        .then(function(response) { return response.json(); })
        .then(function(data) { return data.folders || []; })
        .catch(function() { return []; });
    },

    // Изменить папку (название, скрытость, порядок, обложка)
    updateFolder: function(folderId, updates) {
        var body = { id: folderId };
        for (var key in updates) {
            body[key] = updates[key];
        }
        return fetch(API_BASE + '/folders', {
            method: 'PATCH',
            headers: this.getHeaders(true),
            body: JSON.stringify(body)
        }).then(function(response) { return response.json(); })
          .catch(function() { return null; });
    },

    // Изменить порядок папок
    reorderFolders: function(orders) {
        return fetch(API_BASE + '/folders/reorder', {
            method: 'POST',
            headers: this.getHeaders(true),
            body: JSON.stringify({ orders: orders })
        }).then(function(response) { return response.json(); })
          .catch(function() { return null; });
    },

    // === ФОТО ===
    
    // Получить список фото в папке (без ссылок, только ID и file_id)
    getPhotosList: function(folderId) {
        return fetch(API_BASE + '/photos/list?folder_id=' + folderId, {
            headers: this.getHeaders(this.isAdmin())
        })
        .then(function(response) { return response.json(); })
        .then(function(data) { return data.photos || []; })
        .catch(function() { return []; });
    },

    // Получить ссылки на фото от Telegram
    getPhotosUrls: function(folderId, photos) {
        return fetch(API_BASE + '/photos/urls', {
            method: 'POST',
            headers: this.getHeaders(this.isAdmin()),
            body: JSON.stringify({ 
                folder_id: folderId,
                photos: photos 
            })
        })
        .then(function(response) { return response.json(); })
        .then(function(data) { return data.urls || {}; })
        .catch(function() { return {}; });
    },

    // Удалить фото (мягкое удаление — помечаем deleted: true)
    deletePhoto: function(folderId, photoId) {
        return fetch(API_BASE + '/photos?id=' + photoId + '&folder_id=' + folderId, {
            method: 'DELETE',
            headers: this.getHeaders(true)
        }).then(function(response) { return response.json(); })
          .catch(function() { return null; });
    },

    // === БЭКАП ===
    createBackup: function() {
        return fetch(API_BASE + '/admin/backup', {
            method: 'POST',
            headers: this.getHeaders(true)
        }).then(function(response) { return response.json(); })
          .catch(function() { return { success: false }; });
    },

    // === ОЧИСТКА ХРАНИЛИЩА (папки и фото) ===
    clearStorage: function() {
        return fetch(API_BASE + '/admin/clear-storage', {
            method: 'POST',
            headers: this.getHeaders(true)
        })
        .then(function(response) {
            return response.json();
        })
        .catch(function() {
            return { success: false, error: 'Ошибка соединения' };
        });
    }
};
