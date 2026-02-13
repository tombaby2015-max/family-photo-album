const admin = {
    openModal() {
        document.getElementById('admin-modal').style.display = 'flex';
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-error').textContent = '';
        document.getElementById('admin-password').focus();
    },

    closeModal() {
        document.getElementById('admin-modal').style.display = 'none';
    },

    async login() {
        const password = document.getElementById('admin-password').value;
        const errorEl = document.getElementById('admin-error');
        
        if (!password) {
            errorEl.textContent = 'Введите пароль';
            return;
        }
        
        const result = await api.login(password);
        
        if (result.success) {
            this.closeModal();
            this.showAdminUI();
            gallery.loadFolders();
        } else {
            errorEl.textContent = result.error || 'Ошибка входа';
        }
    },

    logout() {
        api.logout();
        this.hideAdminUI();
        gallery.showMainPage();
    },

    showAdminUI() {
        document.getElementById('admin-panel').style.display = 'block';
        if (gallery.currentFolder) {
            const folderAdmin = document.getElementById('folder-admin-panel');
            if (folderAdmin) folderAdmin.style.display = 'block';
        }
        gallery.loadFolders();
    },

    hideAdminUI() {
        document.getElementById('admin-panel').style.display = 'none';
        const folderAdmin = document.getElementById('folder-admin-panel');
        if (folderAdmin) folderAdmin.style.display = 'none';
        gallery.loadFolders();
    },

    async createFolder() {
        const title = prompt('Введите название папки:');
        if (!title) return;
        
        const result = await api.createFolder(title);
        if (result && result.id) {
            alert('Папка создана!');
            gallery.loadFolders();
        } else {
            alert('Ошибка при создании папки');
        }
    },

    async renameFolder(folderId, currentTitle) {
        const id = folderId || gallery.currentFolder?.id;
        const title = currentTitle || gallery.currentFolder?.title;
        
        if (!id) return;
        
        const newTitle = prompt('Новое название:', title);
        if (!newTitle || newTitle === title) return;
        
        const result = await api.updateFolder(id, { title: newTitle });
        if (result) {
            if (gallery.currentFolder && gallery.currentFolder.id === id) {
                gallery.currentFolder.title = newTitle;
            }
            gallery.loadFolders();
        } else {
            alert('Ошибка при переименовании');
        }
    },

    async toggleFolderHidden(folderId, hidden) {
        if (!confirm(hidden ? 'Скрыть папку?' : 'Показать папку?')) return;
        
        const result = await api.updateFolder(folderId, { hidden });
        if (result) {
            gallery.loadFolders();
        } else {
            alert('Ошибка');
        }
    },

    async deleteFolder(folderId) {
        const id = folderId || gallery.currentFolder?.id;
        if (!id) return;
        
        if (!confirm('Удалить папку? Все фото в ней будут удалены. Это действие нельзя отменить.')) return;
        
        const result = await api.deleteFolder(id);
        if (result) {
            if (gallery.currentFolder && gallery.currentFolder.id === id) {
                gallery.showMainPage();
            } else {
                gallery.loadFolders();
            }
        } else {
            alert('Ошибка при удалении');
        }
    },

    uploadPhoto() {
        document.getElementById('photo-upload').click();
    },

    async handlePhotoUpload(input) {
        const files = input.files;
        if (!files.length) return;
        
        if (!gallery.currentFolder) {
            alert('Сначала откройте папку');
            return;
        }
        
        const folderId = gallery.currentFolder.id;
        const total = files.length;
        let uploaded = 0;
        let failed = 0;
        
        const grid = document.getElementById('photos-grid');
        grid.innerHTML = `<div class="loading">Загрузка: 0/${total}...</div>`;
        
        for (const file of files) {
            console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
            
            try {
                // Проверяем размер (Telegram ограничение ~20MB)
                if (file.size > 20 * 1024 * 1024) {
                    console.error('File too large:', file.name);
                    failed++;
                    continue;
                }
                
                const result = await api.uploadPhoto(folderId, file);
                console.log('Upload result:', result);
                
                if (result && result.id) {
                    uploaded++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error('Upload error:', error);
                failed++;
            }
            
            grid.innerHTML = `<div class="loading">Загрузка: ${uploaded + failed}/${total}...</div>`;
        }
        
        await gallery.loadPhotos(folderId);
        
        if (failed > 0) {
            alert(`Загружено: ${uploaded}, Ошибок: ${failed}`);
        } else {
            alert(`Успешно загружено ${uploaded} фото!`);
        }
        
        input.value = '';
    }

    async togglePhotoHidden(photoId, hidden) {
        if (!confirm(hidden ? 'Скрыть фото?' : 'Показать фото?')) return;
        
        const result = await api.updatePhoto(photoId, { hidden });
        if (result && gallery.currentFolder) {
            gallery.loadPhotos(gallery.currentFolder.id);
        } else {
            alert('Ошибка');
        }
    },

    async deletePhoto(photoId) {
        if (!confirm('Удалить фото? Это действие нельзя отменить.')) return;
        
        const result = await api.deletePhoto(photoId);
        if (result && gallery.currentFolder) {
            gallery.loadPhotos(gallery.currentFolder.id);
        } else {
            alert('Ошибка при удалении');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (api.isAdmin()) {
        admin.showAdminUI();
    }
    
    const passwordInput = document.getElementById('admin-password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                admin.login();
            }
        });
    }
});
