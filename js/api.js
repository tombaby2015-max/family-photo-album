var API_BASE = 'https://photo-app-backend.belovolov-email.workers.dev';

var api = {
    getToken: function() {
        return localStorage.getItem('admin_token');
    },

    isAdmin: function() {
        return !!this.getToken();
    },

    setToken: function(token) {
        localStorage.setItem('admin_token', token);
    },

    clearToken: function() {
        localStorage.removeItem('admin_token');
    },

    getHeaders: function(isAdmin) {
        var headers = {
            'Content-Type': 'application/json'
        };
        if (isAdmin && this.getToken()) {
            headers['Authorization'] = 'Bearer ' + this.getToken();
        }
        return headers;
    },

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

    getFolders: function(offset) {
        offset = offset || 0;
        return fetch(API_BASE + '/folders?offset=' + offset, {
            headers: this.getHeaders(this.isAdmin())
        })
        .then(function(response) { return response.json(); })
        .catch(function() { return { folders: [], hasMore: false, total: 0 }; });
    },

    createFolder: function(title) {
        return fetch(API_BASE + '/folders', {
            method: 'POST',
            headers: this.getHeaders(true),
            body: JSON.stringify({ title: title })
        }).then(function(response) { return response.json(); })
          .catch(function() { return null; });
    },

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

    deleteFolder: function(folderId) {
        return fetch(API_BASE + '/folders?id=' + folderId, {
            method: 'DELETE',
            headers: this.getHeaders(true)
        }).then(function(response) { return response.json(); })
          .catch(function() { return null; });
    },

    // === НОВОЕ: два эндпоинта вместо одного ===
    
    // Получаем список фото без URL (этап 1)
    getPhotosList: function(folderId, offset) {
        offset = offset || 0;
        return fetch(API_BASE + '/photos/list?folder_id=' + folderId + '&offset=' + offset, {
            headers: this.getHeaders(this.isAdmin())
        })
        .then(function(response) { return response.json(); })
        .catch(function() { return { photos: [], hasMore: false, total: 0 }; });
    },

    // Получаем URL для массива ID фото (этап 2)
    getPhotosUrls: function(photoIds) {
        return fetch(API_BASE + '/photos/urls', {
            method: 'POST',
            headers: this.getHeaders(this.isAdmin()),
            body: JSON.stringify({ photo_ids: photoIds })
        })
        .then(function(response) { return response.json(); })
        .then(function(data) { return data.urls || {}; })
        .catch(function() { return {}; });
    },

    // === УДАЛЕНО: старый getPhotos ===

    uploadPhoto: function(folderId, file) {
        var self = this;
        return this.getFileUrl(file).then(function(fileUrl) {
            return fetch(API_BASE + '/photos', {
                method: 'POST',
                headers: self.getHeaders(true),
                body: JSON.stringify({ folder_id: folderId, file_url: fileUrl })
            }).then(function(response) { return response.json(); });
        }).catch(function() { return null; });
    },

    updatePhoto: function(photoId, updates) {
        var body = { id: photoId };
        for (var key in updates) {
            body[key] = updates[key];
        }
        return fetch(API_BASE + '/photos', {
            method: 'PATCH',
            headers: this.getHeaders(true),
            body: JSON.stringify(body)
        }).then(function(response) { return response.json(); })
          .catch(function() { return null; });
    },

    deletePhoto: function(photoId) {
        return fetch(API_BASE + '/photos?id=' + photoId, {
            method: 'DELETE',
            headers: this.getHeaders(true)
        }).then(function(response) { return response.json(); })
          .catch(function() { return null; });
    },

    getFileUrl: function(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function() {
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    reorderFolders: function(orders) {
        return fetch(API_BASE + '/folders/reorder', {
            method: 'POST',
            headers: this.getHeaders(true),
            body: JSON.stringify({ orders: orders })
        }).then(function(response) { return response.json(); })
          .catch(function() { return null; });
    },

    deleteStorage: function() {
        return fetch(API_BASE + '/admin/storage', {
            method: 'DELETE',
            headers: this.getHeaders(true)
        }).then(function(response) { 
            return response.json(); 
        }).catch(function() { 
            return { success: false, error: 'Ошибка соединения' }; 
        });
    },

    // === УДАЛЕНО: syncStorage ===

};
