// admin.js — админ-панель (новая версия)
// УБРАНА загрузка фото, оставлено только управление

var admin = {
    inactivityTimer: null,
    inactivityTimeout: 15 * 60 * 1000, // 15 минут
    isAdminActive: false,
    
    selectedPhotos: [],

    // === ВХОД И ВЫХОД ===

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
                gallery.loadFolders();
                // Делаем бэкап при входе
                setTimeout(function() {
                    self.createBackup('Вход в админку');
                }, 1000);
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
        location.reload();
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
    },

    // === ТАЙМЕР БЕЗДЕЙСТВИЯ ===

    startInactivityTimer: function() {
        this.stopInactivityTimer();
        var self = this;
        this.inactivityTimer = setTimeout(function() {
            alert('Вы автоматически вышли из админки из-за бездействия');
            self.createBackup('Автовыход из-за бездействия');
            api.logout();
            self.hideAdminUI();
            location.reload();
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

    // === БЭКАПЫ ===

    createBackup: function(reason) {
        var token = api.getToken();
        if (!token) {
            console.error('Нет токена для бэкапа');
            return;
        }
        
        api.createBackup().then(function(result) {
            if (result.success) {
                console.log('✅ Бэкап создан:', reason);
            } else {
                console.error('❌ Ошибка бэкапа:', result.error);
            }
        }).catch(function(error) {
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
        
        api.createBackup().then(function(result) {
            if (result.success) {
                alert('✅ Бэкап создан и отправлен в Telegram!');
            } else {
                alert('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
            }
        }).catch(function(error) {
            alert('❌ Ошибка: ' + error.message);
        });
    },

    // === УПРАВЛЕНИЕ ПАПКАМИ ===

    initSortable: function() {
        var container = document.getElementById('folders-container');
        if (!container || !api.isAdmin()) return;
        
        // На мобильных отключаем drag&drop
        var isMobile = window.matchMedia("(max-width: 768px)").matches;
        if (isMobile) {
            console.log('На мобильных перетаскивание отключено');
            return;
        }
        
        var self = this;
        
        new Sortable(container, {
            animation: 150,
            handle: '.folder-card',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: function(evt) {
                var items = container.querySelectorAll('li.folder-card');
                var newOrder = [];
                for (var i = 0; i < items.length; i++) {
                    var id = items[i].getAttribute('data-folder-id');
                    if (id) {
                        newOrder.push({ id: id, order: i + 1 });
                    }
                }
                
                self.saveFoldersOrder(newOrder);
            }
        });
    },

    saveFoldersOrder: function(newOrder) {
        console.log('Сохраняю порядок:', newOrder);
        
        var self = this;
        
        api.reorderFolders(newOrder).then(function(result) {
            if (result && result.success) {
                console.log('✅ Порядок сохранен');
                self.createBackup('Изменение порядка папок');
            } else {
                console.error('❌ Ошибка сохранения порядка');
                alert('Ошибка сохранения порядка!');
            }
        }).catch(function(error) {
            console.error('❌ Ошибка сети:', error);
            alert('Ошибка соединения при сохранении порядка.');
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
        
        if (!confirm('Удалить папку? Фото останутся в Telegram, но исчезнут с сайта.')) return;
        
        // На самом деле мы не удаляем папку полностью, а просто скрываем
        // Потому что в Telegram тема остаётся
        var self = this;
        api.updateFolder(id, { hidden: true }).then(function(result) {
            if (result) {
                self.createBackup('Скрытие папки (удаление)');
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

    // === УПРАВЛЕНИЕ ФОТО ===

    // УДАЛЕНО: uploadPhoto, handlePhotoSelection и вся загрузка
    // Теперь фото загружаются только через Telegram

    togglePhotoHidden: function(photoId, hidden) {
        var self = this;
        // Фото нельзя скрыть отдельно в новой системе, только удалить
        // Но оставим для совместимости
        console.log('Скрытие фото:', photoId, hidden);
    },

    deletePhoto: function(photoId) {
        if (!confirm('Удалить фото? Оно исчезнет с сайта, но останется в Telegram.')) return;
        
        var self = this;
        var folderId = gallery.currentFolder ? gallery.currentFolder.id : null;
        
        if (!folderId) {
            alert('Ошибка: не выбрана папка');
            return;
        }
        
        api.deletePhoto(folderId, photoId).then(function(result) {
            if (result) {
                self.createBackup('Удаление фото');
                gallery.loadPhotos(folderId);
            } else {
                alert('Ошибка при удалении');
            }
        }).catch(function(e) {
            alert('Ошибка при удалении');
        });
    },

    deleteCurrentPhoto: function() {
        if (gallery.currentPhotos.length === 0 || gallery.currentPhotoIndex < 0) return;
        
        var photo = gallery.currentPhotos[gallery.currentPhotoIndex];
        if (!photo) return;
        
        if (!confirm('Удалить это фото?')) return;
        
        var self = this;
        var folderId = gallery.currentFolder ? gallery.currentFolder.id : null;
        
        api.deletePhoto(folderId, photo.id).then(function(result) {
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

    // === МАССОВОЕ УДАЛЕНИЕ ===

    enterSelectionMode: function() {
        this.selectedPhotos = [];
        this.updateToolbar();
        
        var toolbar = document.getElementById('photo-toolbar');
        if (toolbar) toolbar.style.display = 'block';
        
        var photos = document.querySelectorAll('.photo-item');
        for (var i = 0; i < photos.length; i++) {
            (function(photo, index) {
                var checkbox = document.createElement('div');
                checkbox.className = 'photo-checkbox';
                checkbox.style.cssText = 'position:absolute;top:5px;left:5px;width:24px;height:24px;background:#fff;border:2px solid #27ae60;border-radius:4px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;font-size:16px;';
                checkbox.innerHTML = '';
                
                var photoId = photo.getAttribute('data-id');
                checkbox.onclick = function(e) {
                    e.stopPropagation();
                    admin.togglePhotoSelection(photoId, checkbox);
                };
                
                photo.style.position = 'relative';
                photo.appendChild(checkbox);
            })(photos[i], i);
        }
    },

    exitSelectionMode: function() {
        this.selectedPhotos = [];
        
        var toolbar = document.getElementById('photo-toolbar');
        if (toolbar) toolbar.style.display = 'none';
        
        var checkboxes = document.querySelectorAll('.photo-checkbox');
        for (var i = 0; i < checkboxes.length; i++) {
            checkboxes[i].remove();
        }
    },

    toggleSelectAll: function() {
        var allPhotos = document.querySelectorAll('.photo-item');
        var checkboxes = document.querySelectorAll('.photo-checkbox');
        var btn = document.getElementById('btn-select-all');
        
        var allSelected = this.selectedPhotos.length === allPhotos.length && allPhotos.length > 0;
        
        if (allSelected) {
            this.selectedPhotos = [];
            for (var i = 0; i < checkboxes.length; i++) {
                checkboxes[i].innerHTML = '';
                checkboxes[i].style.background = '#fff';
            }
            btn.textContent = '☐ Выбрать все';
        } else {
            this.selectedPhotos = [];
            for (var i = 0; i < allPhotos.length; i++) {
                var photoId = allPhotos[i].getAttribute('data-id');
                if (photoId) {
                    this.selectedPhotos.push(photoId);
                    if (checkboxes[i]) {
                        checkboxes[i].innerHTML = '✓';
                        checkboxes[i].style.background = '#27ae60';
                        checkboxes[i].style.color = '#fff';
                    }
                }
            }
            btn.textContent = '☑ Снять выбор';
        }
        
        this.updateToolbar();
    },

    togglePhotoSelection: function(photoId, checkbox) {
        var index = this.selectedPhotos.indexOf(photoId);
        
        if (index > -1) {
            this.selectedPhotos.splice(index, 1);
            checkbox.innerHTML = '';
            checkbox.style.background = '#fff';
        } else {
            this.selectedPhotos.push(photoId);
            checkbox.innerHTML = '✓';
            checkbox.style.background = '#27ae60';
            checkbox.style.color = '#fff';
        }
        
        var allPhotos = document.querySelectorAll('.photo-item');
        var btn = document.getElementById('btn-select-all');
        if (this.selectedPhotos.length === allPhotos.length) {
            btn.textContent = '☑ Снять выбор';
        } else {
            btn.textContent = '☐ Выбрать все';
        }
        
        this.updateToolbar();
    },

    updateToolbar: function() {
        var btn = document.getElementById('btn-delete-selected');
        if (btn) {
            btn.textContent = '🗑 Удалить выбранные (' + this.selectedPhotos.length + ')';
            btn.disabled = this.selectedPhotos.length === 0;
            btn.style.opacity = this.selectedPhotos.length === 0 ? '0.5' : '1';
        }
    },

    deleteSelectedPhotos: function() {
        if (this.selectedPhotos.length === 0) return;
        
        if (!confirm('Удалить ' + this.selectedPhotos.length + ' фото?')) return;
        
        var self = this;
        var folderId = gallery.currentFolder ? gallery.currentFolder.id : null;
        var deleted = 0;
        var errors = 0;
        
        function deleteNext() {
            if (self.selectedPhotos.length === 0) {
                alert('Удалено: ' + deleted + '\nОшибок: ' + errors);
                self.exitSelectionMode();
                if (gallery.currentFolder) {
                    gallery.loadPhotos(gallery.currentFolder.id);
                }
                return;
            }
            
            var photoId = self.selectedPhotos.shift();
            
            api.deletePhoto(folderId, photoId).then(function(result) {
                if (result) {
                    deleted++;
                } else {
                    errors++;
                }
                deleteNext();
            }).catch(function() {
                errors++;
                deleteNext();
            });
        }
        
        deleteNext();
    },

    // === ОБЛОЖКИ ПАПОК ===

setFolderCover: function() {
    var img = document.getElementById('fullscreen-image');
    if (!img || !img.src || !gallery.currentFolder) return;
    
    var folderId = gallery.currentFolder.id;
    
    // Находим текущее фото в списке
    var currentPhoto = gallery.visiblePhotos[gallery.currentPhotoIndex];
    if (!currentPhoto || !currentPhoto.file_id) {
        alert('Ошибка: не найдено фото');
        return;
    }
    
    var self = this;
    // Сохраняем file_id как обложку (не URL!)
    api.updateFolder(folderId, { cover_url: currentPhoto.file_id }).then(function(result) {
        if (result) {
            gallery.currentFolder.cover_url = currentPhoto.file_id;
            gallery.closeFullscreen();
            gallery.loadFolders();
            self.createBackup('Установка превью папки');
        } else {
            alert('Ошибка установки обложки');
        }
    }).catch(function(e) {
        console.error('Ошибка:', e);
        alert('Ошибка установки обложки');
    });
},

    // === ОЧИСТКА ХРАНИЛИЩА (опасно!) ===

    openClearStorageModal: function() {
        document.getElementById('clear-storage-modal').style.display = 'flex';
        document.getElementById('clear-storage-password').value = '';
        document.getElementById('clear-storage-error').textContent = '';
        document.getElementById('clear-storage-password').focus();
    },

    closeClearStorageModal: function() {
        document.getElementById('clear-storage-modal').style.display = 'none';
    },

    confirmClearStorage: function() {
        var password = document.getElementById('clear-storage-password').value;
        var errorEl = document.getElementById('clear-storage-error');
        
        if (!password) {
            errorEl.textContent = 'Введите пароль';
            return;
        }
        
        var self = this;
        api.login(password).then(function(result) {
            if (!result.success) {
                errorEl.textContent = 'Неверный пароль';
                return;
            }
            
            // Очистка KV — только для админов
            // Это удалит ВСЕ данные из KV!
            alert('Функция очистки требует ручного вмешательства. Обратитесь к разработчику.');
            self.closeClearStorageModal();
        });
    },

    // === ОБНОВЛЕНИЕ СТРАНИЦЫ ===

    reloadPage: function() {
        location.reload(true);
    },

    // === ПРОСМОТР ХРАНИЛИЩА ===

    viewStorage: function() {
        var token = api.getToken();
        
        if (!token) {
            alert('Ошибка: не авторизован');
            return;
        }
        
        // Создаём модальное окно
        var modal = document.getElementById('storage-viewer');
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = 'storage-viewer';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10002;overflow:auto;display:none;';
        modal.innerHTML = 
            '<div style="background:#fff;max-width:900px;margin:50px auto;padding:30px;border-radius:8px;position:relative;">' +
                '<button onclick="document.getElementById(\'storage-viewer\').remove()" style="position:absolute;top:15px;right:15px;background:none;border:none;font-size:24px;cursor:pointer;">×</button>' +
                '<h2 style="margin-top:0;">📦 Данные хранилища</h2>' +
                '<div id="storage-content" style="font-family:monospace;font-size:13px;line-height:1.6;">' +
                    '<p>Загрузка...</p>' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Загружаем данные через API
        fetch(API_BASE + '/admin/storage-info', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(function(r) { return r.json(); })
        .then(function(response) {
            if (!response.success) {
                document.getElementById('storage-content').innerHTML = '<p style="color:red;">Ошибка: ' + (response.error || 'Unknown error') + '</p>';
                return;
            }
            
            // Формируем HTML с данными
            var folders = response.folders || [];
            var photos = response.photos || [];
            
            var html = '';
            
            // Статистика
            html += '<h3>📊 Статистика</h3>';
            html += '<p><strong>Папок:</strong> ' + folders.length + '</p>';
            html += '<p><strong>Фото:</strong> ' + photos.length + '</p>';
            
            // Папки
            html += '<h3 style="margin-top:20px;">📁 ПАПКИ</h3>';
            html += '<table style="width:100%;border-collapse:collapse;">';
            html += '<tr style="background:#f0f0f0;"><th style="padding:8px;border:1px solid #ddd;">ID</th><th style="padding:8px;border:1px solid #ddd;">Название</th><th style="padding:8px;border:1px solid #ddd;">Скрыта</th></tr>';
            
            for (var i = 0; i < folders.length; i++) {
                var f = folders[i];
                html += '<tr>';
                html += '<td style="padding:8px;border:1px solid #ddd;">' + f.id + '</td>';
                html += '<td style="padding:8px;border:1px solid #ddd;">' + f.title + '</td>';
                html += '<td style="padding:8px;border:1px solid #ddd;">' + (f.hidden ? '✓' : '') + '</td>';
                html += '</tr>';
            }
            html += '</table>';
            
            // Фото
            var activePhotos = 0;
            var deletedPhotos = 0;
            for (var j = 0; j < photos.length; j++) {
                if (photos[j].deleted) deletedPhotos++;
                else activePhotos++;
            }
            
            html += '<h3 style="margin-top:20px;">📷 ФОТО</h3>';
            html += '<p>Активных: ' + activePhotos + ' | Удалённых: ' + deletedPhotos + '</p>';
            
            document.getElementById('storage-content').innerHTML = html;
        })
        .catch(function(error) {
            document.getElementById('storage-content').innerHTML = '<p style="color:red;">Ошибка загрузки: ' + error.message + '</p>';
        });
    }
};

// При загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    if (api.isAdmin()) {
        admin.showAdminUI();
        admin.startInactivityTimer();
    }
    
    var passwordInput = document.getElementById('admin-password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') admin.login();
        });
    }
    
    // Сброс таймера при любой активности
    ['click', 'touchstart', 'keydown', 'scroll'].forEach(function(event) {
        document.addEventListener(event, function() {
            if (admin.isAdminActive) {
                admin.resetInactivityTimer();
            }
        });
    });
});
