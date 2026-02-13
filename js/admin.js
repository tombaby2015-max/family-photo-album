const admin = {
    openModal() {
        const modal = document.getElementById('admin-modal');
        const passwordInput = document.getElementById('admin-password');
        const errorEl = document.getElementById('admin-error');
        
        if (modal) {
            modal.style.display = 'flex';
            if (passwordInput) passwordInput.value = '';
            if (errorEl) errorEl.textContent = '';
            if (passwordInput) passwordInput.focus();
        }
    },

    closeModal() {
        const modal = document.getElementById('admin-modal');
        if (modal) modal.style.display = 'none';
    },

    async login() {
        const passwordInput = document.getElementById('admin-password');
        const errorEl = document.getElementById('admin-error');
        
        if (!passwordInput) return;
        
        const password = passwordInput.value;
        
        if (!password) {
            if (errorEl) errorEl.textContent = 'Введите пароль';
            return;
        }
        
        try {
            const result = await api.login(password);
            
            if (result.success) {
                this.closeModal();
                this.showAdminUI();
                if (typeof gallery !== 'undefined') gallery.loadFolders();
            } else {
                if (errorEl) errorEl.textContent = result.error || 'Ошибка входа';
            }
        } catch (e) {
            if (errorEl) errorEl.textContent = 'Ошибка соединения';
        }
    },

    logout() {
        api.logout();
        this.hideAdminUI();
        if (typeof gallery !== 'undefined') gallery.showMainPage();
    },

    showAdminUI() {
        const adminPanel = document.getElementById('admin-panel');
        const folderAdminPanel = document.getElementById('folder-admin-panel');
        
        if (adminPanel) adminPanel.style.display = 'block';
        if (folderAdminPanel) folderAdminPanel.style.display = 'block';
        
        if (typeof gallery !== 'undefined') gallery.loadFolders();
    },

    hideAdminUI() {
        const adminPanel = document.getElementById('admin-panel');
        const folderAdminPanel = document.getElementById('folder-admin-panel');
        
        if (adminPanel) adminPanel.style.display = 'none';
        if (folderAdminPanel) folderAdminPanel.style.display = 'none';
        
        if (typeof gallery !== 'undefined') gallery.loadFolders();
    },

    async createFolder() {
        const title = prompt('Введите название папки:');
        if (!title) return;
        
        try {
            const result = await api.createFolder(title);
            if (result && result.id) {
                alert('Папка создана!');
                if (typeof gallery !== 'undefined') gallery.loadFolders();
            } else {
                alert('Ошибка при создании папки');
            }
        } catch (e) {
            alert('Ошибка при создании папки');
        }
    },

    async renameFolder(folderId, currentTitle) {
        const id = folderId || (gallery && gallery.currentFolder ? gallery.currentFolder.id : null);
        const title = currentTitle || (gallery && gallery.currentFolder ? gallery.currentFolder.title : '');
        
        if (!id) return;
        
        const newTitle = prompt('Новое название:', title);
        if (!newTitle || newTitle === title) return;
        
        try {
            const result = await api.updateFolder(id, { title: newTitle });
            if (result) {
                if (gallery && gallery.currentFolder && gallery.currentFolder.id === id) {
                    gallery.currentFolder.title = newTitle;
                }
                gallery.loadFolders();
            } else {
                alert('Ошибка при переименовании');
            }
        } catch (e) {
            alert('Ошибка при переименовании');
        }
    },

    async toggleFolderHidden(folderId, hidden) {
        if (!confirm(hidden ? 'Скрыть папку?' : 'Показать папку?')) return;
        
        try {
            const result = await api.updateFolder(folderId, { hidden });
            if (result) {
                gallery.loadFolders();
            } else {
                alert('Ошибка');
            }
        } catch (e) {
            alert('Ошибка');
        }
    },

    async deleteFolder(folderId) {
        const id = folderId || (gallery && gallery.currentFolder ? gallery.currentFolder.id : null);
        if (!id) return;
        
        if (!confirm('Удалить папку? Все фото в ней будут удалены. Это действие нельзя отменить.')) return;
        
        try {
            const result = await api.deleteFolder(id);
            if (result) {
                if (gallery && gallery.currentFolder && gallery.currentFolder.id === id) {
                    gallery.showMainPage();
                } else {
                    gallery.loadFolders();
                }
            } else {
                alert('Ошибка при удалении');
            }
        } catch (e) {
            alert('Ошибка при удалении');
        }
    },

    uploadPhoto() {
        const input = document.getElementById('photo-upload');
        if (input) input.click();
    },

    async handlePhotoUpload(input) {
        const files = input.files;
        if (!files.length) return;
        
        if (!gallery || !gallery.currentFolder) {
            alert('Сначала откройте папку');
            return;
        }
        
        const folderId = gallery.currentFolder.id;
        const total = files.length;
        let uploaded = 0;
        let failed = 0;
        
        const grid = document.getElementById('photos-grid');
        if (grid) grid.innerHTML = `<div class="loading">Загрузка: 0/${total}...</div>`;
        
        for (const file of files) {
            try {
                const result = await api.uploadPhoto(folderId, file);
                
                if (result && result.id) {
                    uploaded++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error('Upload error:', error);
                failed++;
            }
            
            if (grid) grid.innerHTML = `<div class="loading">Загрузка: ${uploaded + failed}/${total}...</div>`;
        }
        
        await gallery.loadPhotos(folderId);
        
        if (failed > 0) {
            alert(`Загружено: ${uploaded}, Ошибок: ${failed}`);
        } else {
            alert(`Успешно загружено ${uploaded} фото!`);
        }
        
        input.value = '';
    },

    async togglePhotoHidden(photoId, hidden) {
        if (!confirm(hidden ? 'Скрыть фото?' : 'Показать фото?')) return;
        
        try {
            const result = await api.updatePhoto(photoId, { hidden });
            if (result && gallery && gallery.currentFolder) {
                gallery.loadPhotos(gallery.currentFolder.id);
            } else {
                alert('Ошибка');
            }
        } catch (e) {
            alert('Ошибка');
        }
    },

    async deletePhoto(photoId) {
        if (!confirm('Удалить фото? Это действие нельзя отменить.')) return;
        
        try {
            const result = await api.deletePhoto(photoId);
            if (result && gallery && gallery.currentFolder) {
                gallery.loadPhotos(gallery.currentFolder.id);
            } else {
                alert('Ошибка при удалении');
            }
        } catch (e) {
            alert('Ошибка при удалении');
        }
    }
};

// Проверка входа при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    if (api && api.isAdmin && api.isAdmin()) {
        admin.showAdminUI();
    }
    
    // Enter в поле пароля
    const passwordInput = document.getElementById('admin-password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') admin.login();
        });
    }
});
