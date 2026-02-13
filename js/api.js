const API_BASE = 'https://photo-app-backend.belovolov-email.workers.dev';

const api = {
    getToken() {
        return localStorage.getItem('admin_token');
    },

    isAdmin() {
        return !!this.getToken();
    },

    setToken(token) {
        localStorage.setItem('admin_token', token);
    },

    clearToken() {
        localStorage.removeItem('admin_token');
    },

    getHeaders(isAdmin = false) {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (isAdmin && this.getToken()) {
            headers['Authorization'] = `Bearer ${this.getToken()}`;
        }
        return headers;
    },

    async login(password) {
        try {
            const response = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ password })
            });
            const data = await response.json();
            if (data.token) {
                this.setToken(data.token);
                return { success: true };
            }
            return { success: false, error: data.error || 'Неверный пароль' };
        } catch (error) {
            return { success: false, error: 'Ошибка соединения' };
        }
    },

    logout() {
        this.clearToken();
    },

    async getFolders() {
        try {
            const response = await fetch(`${API_BASE}/folders`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching folders:', error);
            return [];
        }
    },

    async createFolder(title) {
        try {
            const response = await fetch(`${API_BASE}/folders`, {
                method: 'POST',
                headers: this.getHeaders(true),
                body: JSON.stringify({ title })
            });
            return await response.json();
        } catch (error) {
            console.error('Error creating folder:', error);
            return null;
        }
    },

    async updateFolder(folderId, updates) {
        try {
            const response = await fetch(`${API_BASE}/folders`, {
                method: 'PATCH',
                headers: this.getHeaders(true),
                body: JSON.stringify({ id: folderId, ...updates })
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating folder:', error);
            return null;
        }
    },

    async deleteFolder(folderId) {
        try {
            const response = await fetch(`${API_BASE}/folders?id=${folderId}`, {
                method: 'DELETE',
                headers: this.getHeaders(true)
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting folder:', error);
            return null;
        }
    },

    async getPhotos(folderId) {
        try {
            const response = await fetch(`${API_BASE}/photos?folder_id=${folderId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching photos:', error);
            return [];
        }
    },

        // Upload photo - отправляем файл напрямую
    async uploadPhoto(folderId, file) {
        try {
            // Получаем информацию о папке (нужен topic_id)
            const folders = await this.getFolders();
            const folder = folders.find(f => f.id === folderId);
            if (!folder) return null;

            // Создаем FormData для отправки файла
            const formData = new FormData();
            formData.append('chat_id', env.CHAT_ID); // Это не сработает с клиента
            
            // Пока отправляем через base64 но с правильным форматом
            const base64 = await this.getFileUrl(file);
            
            const response = await fetch(`${API_BASE}/photos`, {
                method: 'POST',
                headers: this.getHeaders(true),
                body: JSON.stringify({ 
                    folder_id: folderId, 
                    file_url: base64,
                    filename: file.name
                })
            });
            
            if (!response.ok) {
                const error = await response.text();
                console.error('Server error:', error);
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error uploading photo:', error);
            return null;
        }
    },
    async updatePhoto(photoId, updates) {
        try {
            const response = await fetch(`${API_BASE}/photos`, {
                method: 'PATCH',
                headers: this.getHeaders(true),
                body: JSON.stringify({ id: photoId, ...updates })
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating photo:', error);
            return null;
        }
    },

    async deletePhoto(photoId) {
        try {
            const response = await fetch(`${API_BASE}/photos?id=${photoId}`, {
                method: 'DELETE',
                headers: this.getHeaders(true)
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting photo:', error);
            return null;
        }
    },

    async getFileUrl(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result);
            };
            reader.readAsDataURL(file);
        });
    }
};
