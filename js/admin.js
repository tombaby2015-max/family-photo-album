// Модуль администратора
const admin = {
    // Открыть модальное окно входа
    openModal: function() {
        var modal = document.getElementById('admin-modal');
        var passwordInput = document.getElementById('admin-password');
        var errorEl = document.getElementById('admin-error');
        
        if (modal) {
            modal.style.display = 'flex';
            if (passwordInput) passwordInput.value = '';
            if (errorEl) errorEl.textContent = '';
            if (passwordInput) passwordInput.focus();
        }
    },

    // Закрыть модальное окно
    closeModal: function() {
        var modal = document.getElementById('admin-modal');
        if (modal) modal.style.display = 'none';
    },

    // Вход в админку
    login: function() {
        var passwordInput = document.getElementById('admin-password');
        var errorEl = document.getElementById('admin-error');
        
        if (!passwordInput) return;
        
        var password = passwordInput.value;
        
        if (!password) {
            if (errorEl) errorEl.textContent = 'Введите пароль';
            return;
        }
        
        api.login(password).then(function(result) {
            if (result.success) {
                admin.closeModal();
                admin.showAdminUI();
                if (typeof gallery !== 'undefined') gallery.loadFolders();
            } else {
                if (errorEl) errorEl.textContent = result.error || 'Ошибка входа';
            }
        }).catch(function(e) {
            if (errorEl) errorEl.textContent = 'Ошибка соединения';
        });
    },

    // Выход из админки
    logout: function() {
        api.logout();
        admin.hideAdminUI();
        if (typeof gallery !== 'undefined') gallery.showMainPage();
    },

    // Показать админ-интерфейс
    showAdminUI: function() {
        var adminPanel = document.getElementById('admin-panel');
        var folderAdminPanel = document.getElementById('folder-admin-panel');
        
        if (adminPanel) adminPanel.style.display = 'block';
        if (folderAdminPanel) folderAdminPanel.style.display = 'block';
        
        if (typeof gallery !== 'undefined') gallery.loadFolders();
    },

    // Скрыть админ-интерфейс
    hideAdminUI: function() {
        var adminPanel = document.getElementById('admin-panel');
        var folderAdminPanel = document.getElementById('folder-admin-panel');
        
        if (adminPanel) adminPanel.style.display = 'none';
        if (folderAdminPanel) folderAdminPanel.style.display = 'none';
        
        if (typeof gallery !== 'undefined') gallery.loadFolders();
    },

    // Создать папку
    createFolder: function() {
        var title = prompt('Введите название папки:');
        if (!title) return;
        
        api.createFolder(title).then(function(result) {
            if (result && result.id) {
                alert('Папка создана!');
                if (typeof gallery !== 'undefined') gallery.loadFolders();
            } else {
                alert('Ошибка при создании папки');
            }
        }).catch(function(e) {
            alert('Ошибка при создании папки');
        });
    },

    // Переименовать папку
    renameFolder: function(folderId, currentTitle) {
        var id = folderId || (gallery && gallery.currentFolder ? gallery.currentFolder.id : null);
        var title = currentTitle || (gallery && gallery.currentFolder ? gallery.currentFolder.title : '');
        
        if (!id) return;
        
        var newTitle = prompt('Новое название:', title);
        if (!newTitle || newTitle === title) return;
        
        api.updateFolder(id, { title: newTitle }).then(function(result) {
            if (result) {
                if (gallery && gallery.currentFolder && gallery.currentFolder.id === id) {
                    gallery.currentFolder.title = newTitle;
                }
                gallery.loadFolders();
            } else {
                alert('Ошибка при переименовании');
            }
        }).catch(function(e) {
            alert('Ошибка при переименовании');
        });
    },

    // Скрыть/показать папку
    toggleFolderHidden: function(folderId, hidden) {
        if (!confirm(hidden ? 'Скрыть папку?' : 'Показать папку?')) return;
        
        api.updateFolder(folderId, { hidden: hidden }).then(function(result) {
            if (result) {
                gallery.loadFolders();
            } else {
                alert('Ошибка');
            }
        }).catch(function(e) {
            alert('Ошибка');
        });
    },

    // Удалить папку
    deleteFolder: function(folderId) {
        var id = folderId || (gallery && gallery.currentFolder ? gallery.currentFolder.id : null);
        if (!id) return;
        
        if (!confirm('Удалить папку? Все фото в ней будут удалены. Это действие нельзя отменить.')) return;
        
        api.deleteFolder(id).then(function(result) {
            if (result) {
                if (gallery && gallery.currentFolder && gallery.currentFolder.id === id) {
                    gallery.showMainPage();
                } else {
                    gallery.loadFolders();
                }
            } else {
                alert('Ошибка при удалении');
            }
        }).catch(function(e) {
            alert('Ошибка при удалении');
        });
    },

    // Открыть выбор файлов для загрузки
    uploadPhoto: function() {
        var input = document.getElementById('photo-upload');
        if (input) input.click();
    },

    // Обработка загрузки фото
    handlePhotoUpload: function(input) {
        var files = input.files;
        if (!files.length) return;
        
        if (!gallery || !gallery.currentFolder) {
            alert('Сначала откройте папку');
            return;
        }
        
        var folderId = gallery.currentFolder.id;
        var total = files.length;
        var uploaded = 0;
        var failed = 0;
        
        var grid = document.getElementById('photos-grid');
        if (grid) grid.innerHTML = '<div class="loading">Загрузка: 0/' + total + '...</div>';
        
        function uploadNext(index) {
            if (index >= files.length) {
                // Все файлы обработаны
                gallery.loadPhotos(folderId).then(function() {
                    if (failed > 0) {
                        alert('Загружено: ' + uploaded + ', Ошибок: ' + failed);
                    } else {
                        alert('Успешно загружено ' + uploaded + ' фото!');
                    }
                });
                input.value = '';
                return;
            }
            
            var file = files[index];
            
            api.uploadPhoto(folderId, file).then(function(result) {
                if (result && result.id) {
                    uploaded++;
                } else {
                    failed++;
                }
                if (grid) grid.innerHTML = '<div class="loading">Загрузка: ' + (uploaded + failed) + '/' + total + '...</div>';
                uploadNext(index + 1);
            }).catch(function(error) {
                console.error('Upload error:', error);
                failed++;
                if (grid) grid.innerHTML = '<div class="loading">Загрузка: ' + (uploaded + failed) + '/' + total + '...</div>';
                uploadNext(index + 1);
            });
        }
        
        uploadNext(0);
    },

    // Скрыть/показать фото
    togglePhotoHidden: function(photoId, hidden) {
        if (!confirm(hidden ? 'Скрыть фото?' : 'Показать фото?')) return;
        
        api.updatePhoto(photoId, { hidden: hidden }).then(function(result) {
            if (result && gallery && gallery.currentFolder) {
                gallery.loadPhotos(gallery.currentFolder.id);
            } else {
                alert('Ошибка');
            }
        }).catch(function(e) {
            alert('Ошибка');
        });
    },

    // Удалить фото
    deletePhoto: function(photoId) {
        if (!confirm('Удалить фото? Это действие нельзя отменить.')) return;
        
        api.deletePhoto(photoId).then(function(result) {
            if (result && gallery && gallery.currentFolder) {
                gallery.loadPhotos(gallery.currentFolder.id);
            } else {
                alert('Ошибка при удалении');
            }
        }).catch(function(e) {
            alert('Ошибка при удалении');
        });
    }
};

// Проверка входа при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    if (api && api.isAdmin && api.isAdmin()) {
        admin.showAdminUI();
    }
    
    // Enter в поле пароля
    var passwordInput = document.getElementById('admin-password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') admin.login();
        });
    }
});
