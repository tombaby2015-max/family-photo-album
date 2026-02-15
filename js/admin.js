var admin = {
    inactivityTimer: null,
    inactivityTimeout: 15 * 60 * 1000,
    isAdminActive: false,

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

    closeModal: function() {
        var modal = document.getElementById('admin-modal');
        if (modal) modal.style.display = 'none';
    },

    login: function() {
        var passwordInput = document.getElementById('admin-password');
        var errorEl = document.getElementById('admin-error');
        
        if (!passwordInput) return;
        
        var password = passwordInput.value;
        
        if (!password) {
            if (errorEl) errorEl.textContent = 'Введите пароль';
            return;
        }
        
        var self = this;
        api.login(password).then(function(result) {
            if (result.success) {
                self.closeModal();
                self.showAdminUI();
                self.startInactivityTimer();
                self.setupBeforeUnload();
                gallery.loadFolders();
            } else {
                if (errorEl) errorEl.textContent = result.error || 'Ошибка входа';
            }
        }).catch(function(e) {
            if (errorEl) errorEl.textContent = 'Ошибка соединения';
        });
    },

    logout: function() {
        this.createBackup('Выход из админки');
        api.logout();
        this.hideAdminUI();
        this.stopInactivityTimer();
        this.removeBeforeUnload();
        gallery.showMainPage();
    },

    showAdminUI: function() {
        var adminPanel = document.getElementById('admin-panel');
        var folderAdminPanel = document.getElementById('sidebar-admin-buttons');
        
        if (adminPanel) adminPanel.style.display = 'block';
        if (folderAdminPanel) folderAdminPanel.style.display = 'flex';
        
        this.isAdminActive = true;
        gallery.loadFolders();
    },

    hideAdminUI: function() {
        var adminPanel = document.getElementById('admin-panel');
        var folderAdminPanel = document.getElementById('sidebar-admin-buttons');
        
        if (adminPanel) adminPanel.style.display = 'none';
        if (folderAdminPanel) folderAdminPanel.style.display = 'none';
        
        this.isAdminActive = false;
        gallery.loadFolders();
    },

    startInactivityTimer: function() {
        this.stopInactivityTimer();
        var self = this;
        this.inactivityTimer = setTimeout(function() {
            alert('Вы автоматически вышли из админки из-за бездействия ');
            self.createBackup('Автовыход из-за бездействия');
            api.logout();
            self.hideAdminUI();
            gallery.showMainPage();
        }, this.inactivityTimeout);
    },

    stopInactivityTimer: function() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    },

    resetInactivityTimer: function() {
        if (this.isAdminActive) {
            this.startInactivityTimer();
        }
    },

    setupBeforeUnload: function() {
        var self = this;
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
        document.addEventListener('click', function() { self.resetInactivityTimer(); });
        document.addEventListener('keypress', function() { self.resetInactivityTimer(); });
        document.addEventListener('scroll', function() { self.resetInactivityTimer(); });
    },

    removeBeforeUnload: function() {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    },

    beforeUnloadHandler: function(e) {
        if (admin.isAdminActive) {
            e.preventDefault();
            e.returnValue = 'Вы в админке. Выйти?';
            return e.returnValue;
        }
    },

    reloadPage: function() {
        this.removeBeforeUnload();
        location.reload(true);
    },
    
    createBackup: function(reason) {
        var token = api.getToken();
        if (!token) {
            console.error('No token for backup');
            return;
        }
        
        fetch(API_BASE + '/admin/backup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ 
                reason: reason || 'Ручной бэкап'
            })
        })
        .then(function(response) { return response.json(); })
        .then(function(result) {
            if (result.success) {
                console.log('✅ Бэкап создан:', result.timestamp, '-', reason);
            } else {
                console.error('❌ Ошибка бэкапа:', result.error);
            }
        })
        .catch(function(error) {
            console.error('❌ Ошибка бэкапа:', error);
        });
    },

    manualBackup: function() {
        var self = this;
        var token = api.getToken();
        
        if (!token) {
            alert('Ошибка: не авторизован');
            return;
        }
        
        fetch(API_BASE + '/admin/backup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ 
                reason: 'Ручной бэкап по кнопке'
            })
        })
        .then(function(response) { return response.json(); })
        .then(function(result) {
            if (result.success) {
                alert('✅ Бэкап создан!\n🕐 ' + result.timestamp + '\n📁 Папок: ' + result.folders + '\n📷 Фото: ' + result.photos);
            } else {
                alert('❌ Ошибка: ' + (result.error || 'Unknown error'));
            }
        })
        .catch(function(error) {
            alert('❌ Ошибка: ' + error.message);
        });
    },

    // Синхронизация с Telegram (очистка мёртвых ID)
    syncStorage: function() {
        var self = this;
        var token = api.getToken();
        
        if (!token) {
            alert('Ошибка: не авторизован');
            return;
        }
        
        if (!confirm('Проверить хранилище?\n\nБудет проверено:\n- Существуют ли темы в Telegram\n- Существуют ли фото в Telegram\n\nУдалённые данные будут стёрты из KV')) {
            return;
        }
        
        fetch(API_BASE + '/admin/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        })
        .then(function(response) { return response.json(); })
        .then(function(result) {
            if (result.success) {
                var msg = '✅ Проверка завершена!\n\n';
                msg += '📁 Папок проверено: ' + result.foldersChecked + '\n';
                msg += '🗑️ Папок удалено: ' + result.foldersRemoved + '\n\n';
                msg += '📷 Фото проверено: ' + result.photosChecked + '\n';
                msg += '🗑️ Фото удалено: ' + result.photosRemoved;
                
                if (result.errors.length > 0) {
                    msg += '\n\n⚠️ Ошибок: ' + result.errors.length;
                }
                
                alert(msg);
                gallery.loadFolders();
            } else {
                alert('❌ Ошибка: ' + (result.error || 'Unknown error'));
            }
        })
        .catch(function(error) {
            alert('❌ Ошибка: ' + error.message);
        });
    },
    
    initSortable: function() {
        var container = document.getElementById('folders-container');
        if (!container || !api.isAdmin()) return;
        
        var self = this;
        new Sortable(container, {
            animation: 150,
            handle: '.folder-card',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: function(evt) {
                var items = container.querySelectorAll('li');
                var newOrder = [];
                for (var i = 0; i < items.length; i++) {
                    var id = items[i].getAttribute('data-id');
                    if (id) {
                        newOrder.push({ id: id, order: i + 1 });
                    }
                }
                self.saveFoldersOrder(newOrder);
                self.createBackup('Изменение порядка папок');
            }
        });
    },

    saveFoldersOrder: function(newOrder) {
        var promises = [];
        for (var i = 0; i < newOrder.length; i++) {
            promises.push(api.updateFolder(newOrder[i].id, { order: newOrder[i].order }));
        }
        
        Promise.all(promises).then(function() {
            console.log('Порядок сохранен');
        }).catch(function() {
            console.error('Ошибка сохранения порядка');
        });
    },

    createFolder: function() {
        var title = prompt('Введите название папки:');
        if (!title) return;
        
        var self = this;
        api.createFolder(title).then(function(result) {
            if (result && result.id) {
                self.createBackup('Создание папки: ' + title);
                gallery.loadFolders();
            } else {
                alert('Ошибка при создании папки');
            }
        }).catch(function(e) {
            alert('Ошибка при создании папки');
        });
    },

    renameFolder: function(folderId, currentTitle) {
        var id = folderId || (gallery.currentFolder ? gallery.currentFolder.id : null);
        var title = currentTitle || (gallery.currentFolder ? gallery.currentFolder.title : '');
        
        if (!id) return;
        
        var newTitle = prompt('Новое название:', title);
        if (!newTitle || newTitle === title) return;
        
        var self = this;
        api.updateFolder(id, { title: newTitle }).then(function(result) {
            if (result) {
                if (gallery.currentFolder && gallery.currentFolder.id === id) {
                    gallery.currentFolder.title = newTitle;
                    var titleText = document.getElementById('folder-title-text');
                    if (titleText) titleText.textContent = newTitle;
                }
                self.createBackup('Переименование папки: ' + newTitle);
                gallery.loadFolders();
            } else {
                alert('Ошибка при переименовании');
            }
        }).catch(function(e) {
            alert('Ошибка при переименовании');
        });
    },

    toggleFolderHidden: function(folderId, hidden) {
        // УБРАЛИ confirm, действие сразу без подтверждения
        var self = this;
        api.updateFolder(folderId, { hidden: hidden }).then(function(result) {
            if (result) {
                self.createBackup((hidden ? 'Скрытие' : 'Показ') + ' папки');
                gallery.loadFolders();
            } else {
                console.error('Ошибка скрытия папки');
            }
        }).catch(function(e) {
            console.error('Ошибка');
        });
    },

    deleteFolder: function(folderId) {
        var id = folderId || (gallery.currentFolder ? gallery.currentFolder.id : null);
        if (!id) return;
        
        if (!confirm('Удалить папку? Все фото в ней будут удалены.')) return;
        
        var self = this;
        api.deleteFolder(id).then(function(result) {
            if (result) {
                self.createBackup('Удаление папки');
                if (gallery.currentFolder && gallery.currentFolder.id === id) {
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

    uploadPhoto: function() {
        var input = document.getElementById('photo-upload');
        if (input) input.click();
    },

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
        
        var self = this;
        
        function uploadNext(index) {
            if (index >= files.length) {
                setTimeout(function() {
                    api.getPhotos(folderId).then(function(photos) {
                        gallery.currentPhotos = photos;
                        var isAdmin = api.isAdmin();
                        gallery.visiblePhotos = [];
                        for (var i = 0; i < photos.length; i++) {
                            if (isAdmin || !photos[i].hidden) {
                                gallery.visiblePhotos.push(photos[i]);
                            }
                        }
                        
                        if (grid) {
                            if (gallery.visiblePhotos.length === 0) {
                                grid.innerHTML = '<div class="empty-state"><h4>В этой папке пока нет фото</h4></div>';
                            } else {
                                grid.innerHTML = gallery.visiblePhotos.map(function(photo, idx) {
                                    return gallery.createPhotoItem(photo, idx);
                                }).join('');
                            }
                        }
                        
                        self.createBackup('Загрузка ' + uploaded + ' фото');
                        
                        // УБРАЛИ алерты успеха загрузки
                        console.log('Загружено ' + uploaded + ' фото, ошибок: ' + failed);
                    });
                }, 2000);
                
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

    setFolderCover: function() {
        var img = document.getElementById('fullscreen-image');
        if (!img || !img.src || !gallery.currentFolder) return;
        
        var photoUrl = img.src;
        var folderId = gallery.currentFolder.id;
        
        var self = this;
        api.updateFolder(folderId, { cover_url: photoUrl }).then(function(result) {
            if (result) {
                gallery.currentFolder.cover_url = photoUrl;
                gallery.closeFullscreen();
                gallery.loadFolders();
                self.createBackup('Установка превью папки');
            } else {
                console.error('Ошибка обновления превью');
            }
        }).catch(function(e) {
            console.error('Ошибка обновления превью');
        });
    },

    deleteCurrentPhoto: function() {
        if (gallery.currentPhotos.length === 0 || gallery.currentPhotoIndex < 0) return;
        
        var photo = gallery.currentPhotos[gallery.currentPhotoIndex];
        if (!photo) return;
        
        if (!confirm('Удалить это фото?')) return;
        
        var self = this;
        api.deletePhoto(photo.id).then(function(result) {
            if (result && gallery.currentFolder) {
                self.createBackup('Удаление фото');
                gallery.closeFullscreen();
                gallery.loadPhotos(gallery.currentFolder.id);
            } else {
                alert('Ошибка при удалении');
            }
        }).catch(function(e) {
            alert('Ошибка при удалении');
        });
    },

    togglePhotoHidden: function(photoId, hidden) {
        // УБРАЛИ confirm, действие сразу без подтверждения
        var self = this;
        api.updatePhoto(photoId, { hidden: hidden }).then(function(result) {
            if (result && gallery.currentFolder) {
                self.createBackup((hidden ? 'Скрытие' : 'Показ') + ' фото');
                gallery.loadPhotos(gallery.currentFolder.id);
            } else {
                console.error('Ошибка');
            }
        }).catch(function(e) {
            console.error('Ошибка');
        });
    },

    deletePhoto: function(photoId) {
        if (!confirm('Удалить фото?')) return;
        
        var self = this;
        api.deletePhoto(photoId).then(function(result) {
            if (result && gallery.currentFolder) {
                self.createBackup('Удаление фото');
                gallery.loadPhotos(gallery.currentFolder.id);
            } else {
                alert('Ошибка при удалении');
            }
        }).catch(function(e) {
            alert('Ошибка при удалении');
        });
    }
};

document.addEventListener('DOMContentLoaded', function() {
    if (api.isAdmin()) {
        admin.showAdminUI();
        admin.startInactivityTimer();
        admin.setupBeforeUnload();
    }
    
    var passwordInput = document.getElementById('admin-password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') admin.login();
        });
    }
});
