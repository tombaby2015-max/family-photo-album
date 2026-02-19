var admin = {
    inactivityTimer: null,
    inactivityTimeout: 15 * 60 * 1000,
    isAdminActive: false,
    
    // === НОВОЕ: Очередь загрузки ===
    uploadQueue: [],
    isUploading: false,
    uploadStats: {
        total: 0,
        uploaded: 0,
        failed: 0,
        currentFile: null
    },
    uploadPaused: false,

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
            
            api.deleteStorage().then(function(result) {
                if (result.success) {
                    self.closeClearStorageModal();
                    alert('✅ Хранилище успешно очищено!\n\nВсе папки и фотографии удалены.');
                    gallery.folders = [];
                    gallery.loadFolders();
                } else {
                    errorEl.textContent = result.error || 'Ошибка очистки хранилища';
                }
            });
        });
    },
    
    hideAdminUI: function() {
        var adminPanel = document.getElementById('admin-panel');
        var folderAdminPanel = document.getElementById('sidebar-admin-buttons');
        
        if (adminPanel) adminPanel.style.display = 'none';
        if (folderAdminPanel) folderAdminPanel.style.display = 'none';
        
        this.isAdminActive = false;
    },

    // === ИСПРАВЛЕННЫЙ ТАЙМЕР: сбрасывается при активности ===
    startInactivityTimer: function() {
        this.stopInactivityTimer();
        var self = this;
        this.inactivityTimer = setTimeout(function() {
            // Не выкидываем если идёт загрузка
            if (self.isUploading) {
                console.log('Загрузка активна, таймер бездействия отложен');
                self.startInactivityTimer(); // Перезапускаем
                return;
            }
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

    reloadPage: function() {
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

    restoreBackup: function() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            
            if (!confirm('⚠️ ВНИМАНИЕ!\n\nЭто удалит ВСЕ текущие папки и фото из хранилища и заменит их данными из бэкапа.\n\nПродолжить?')) {
                return;
            }
            
            var reader = new FileReader();
            reader.onload = function(event) {
                try {
                    var backup = JSON.parse(event.target.result);
                    
                    if (!backup.folders || !backup.photos) {
                        alert('❌ Неверный формат файла бэкапа');
                        return;
                    }
                    
                    fetch(API_BASE + '/admin/restore', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + api.getToken()
                        },
                        body: JSON.stringify(backup)
                    })
                    .then(function(response) { return response.json(); })
                    .then(function(result) {
                        if (result.success) {
                            alert('✅ Восстановление завершено!\n\n📁 Папок восстановлено: ' + result.foldersRestored + '\n📷 Фото восстановлено: ' + result.photosRestored);
                            location.reload();
                        } else {
                            alert('❌ Ошибка восстановления: ' + (result.error || 'Unknown error'));
                        }
                    })
                    .catch(function(error) {
                        alert('❌ Ошибка: ' + error.message);
                    });
                    
                } catch (e) {
                    alert('❌ Неверный формат файла бэкапа');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    },

    viewStorage: function() {
        var token = api.getToken();
        
        if (!token) {
            alert('Ошибка: не авторизован');
            return;
        }
        
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
        
        fetch(API_BASE + '/admin/storage-info', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(function(r) { return r.json(); })
        .then(function(response) {
            if (!response.success) {
                document.getElementById('storage-content').innerHTML = '<p style="color:red;">Ошибка: ' + (response.error || 'Unknown error') + '</p>';
                return;
            }
            
            var folders = response.folders || [];
            var photos = response.photos || [];
            
            var html = '';
            
            html += '<h3 style="color:#333;border-bottom:2px solid #333;padding-bottom:10px;">📁 ПАПКИ (' + folders.length + ' шт.)</h3>';
            html += '<table style="width:100%;border-collapse:collapse;margin-bottom:30px;">';
            html += '<tr style="background:#f0f0f0;"><th style="padding:8px;text-align:left;border:1px solid #ddd;">№</th><th style="padding:8px;text-align:left;border:1px solid #ddd;">ID</th><th style="padding:8px;text-align:left;border:1px solid #ddd;">Название</th><th style="padding:8px;text-align:left;border:1px solid #ddd;">Order</th><th style="padding:8px;text-align:left;border:1px solid #ddd;">Topic ID</th><th style="padding:8px;text-align:left;border:1px solid #ddd;">Скрыта</th></tr>';
            
            folders.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
            
            for (var i = 0; i < folders.length; i++) {
                var f = folders[i];
                html += '<tr>';
                html += '<td style="padding:8px;border:1px solid #ddd;">' + (i + 1) + '</td>';
                html += '<td style="padding:8px;border:1px solid #ddd;">' + f.id + '</td>';
                html += '<td style="padding:8px;border:1px solid #ddd;">' + f.title + '</td>';
                html += '<td style="padding:8px;border:1px solid #ddd;font-weight:bold;color:' + (f.order ? '#27ae60' : '#e74c3c') + ';">' + (f.order || 'НЕТ') + '</td>';
                html += '<td style="padding:8px;border:1px solid #ddd;">' + f.topic_id + '</td>';
                html += '<td style="padding:8px;border:1px solid #ddd;">' + (f.hidden ? '✓ Да' : 'Нет') + '</td>';
                html += '</tr>';
            }
            
            html += '</table>';
            
            var activePhotos = 0;
            var deletedPhotos = 0;
            var hiddenPhotos = 0;
            
            for (var j = 0; j < photos.length; j++) {
                if (photos[j].deleted) deletedPhotos++;
                else if (photos[j].hidden) hiddenPhotos++;
                else activePhotos++;
            }
            
            html += '<h3 style="color:#333;border-bottom:2px solid #333;padding-bottom:10px;">📷 ФОТО</h3>';
            html += '<p><strong>Всего записей:</strong> ' + photos.length + '</p>';
            html += '<p><strong>✓ Активных:</strong> ' + activePhotos + '</p>';
            html += '<p><strong>🙈 Скрытых:</strong> ' + hiddenPhotos + '</p>';
            html += '<p><strong>🗑️ Удалённых:</strong> ' + deletedPhotos + '</p>';
            
            html += '<h4 style="margin-top:20px;">Первые 10 фото:</h4>';
            html += '<table style="width:100%;border-collapse:collapse;">';
            html += '<tr style="background:#f0f0f0;"><th style="padding:8px;text-align:left;border:1px solid #ddd;">ID</th><th style="padding:8px;text-align:left;border:1px solid #ddd;">Папка</th><th style="padding:8px;text-align:left;border:1px solid #ddd;">File ID</th><th style="padding:8px;text-align:left;border:1px solid #ddd;">Скрыто</th><th style="padding:8px;text-align:left;border:1px solid #ddd;">Удалено</th></tr>';
            
            var count = 0;
            for (var k = 0; k < photos.length && count < 10; k++) {
                var p = photos[k];
                if (!p.deleted) {
                    html += '<tr>';
                    html += '<td style="padding:8px;border:1px solid #ddd;">' + p.id + '</td>';
                    html += '<td style="padding:8px;border:1px solid #ddd;">' + p.folder_id + '</td>';
                    html += '<td style="padding:8px;border:1px solid #ddd;word-break:break-all;">' + p.file_id.substring(0, 20) + '...</td>';
                    html += '<td style="padding:8px;border:1px solid #ddd;">' + (p.hidden ? '✓' : '') + '</td>';
                    html += '<td style="padding:8px;border:1px solid #ddd;">' + (p.deleted ? '✓' : '') + '</td>';
                    html += '</tr>';
                    count++;
                }
            }
            
            html += '</table>';
            
            document.getElementById('storage-content').innerHTML = html;
        })
        .catch(function(error) {
            document.getElementById('storage-content').innerHTML = '<p style="color:red;">Ошибка загрузки: ' + error.message + '</p>';
        });
    },
    
    syncStorage: function() {
        var self = this;
        var token = api.getToken();
        
        if (!token) {
            alert('Ошибка: не авторизован');
            return;
        }
        
        if (!confirm('🧹 ОЧИСТКА ХРАНИЛИЩА\n\nБудет удалено из KV:\n- Папки, темы которых не найдены в Telegram\n- Фото, файлы которых не найдены в Telegram\n\n⚠️ Восстановить можно только из бэкапа!\n\nПродолжить?')) {
            return;
        }
        
        alert('⏳ Очистка началась...\n\nПодождите 1-2 минуты');
        
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
                var msg = '✅ Очистка завершена!\n\n';
                msg += '📁 Папок проверено: ' + result.foldersChecked + '\n';
                msg += '🗑️ Папок удалено: ' + result.foldersRemoved + '\n\n';
                msg += '📷 Фото проверено: ' + result.photosChecked + '\n';
                msg += '🗑️ Фото удалено: ' + result.photosRemoved + '\n';
                
                if (result.errors.length > 0) {
                    msg += '\n⚠️ Ошибок: ' + result.errors.length + '\n';
                    msg += 'Примеры:\n';
                    for (var k = 0; k < Math.min(result.errors.length, 3); k++) {
                        msg += '- ' + result.errors[k].substring(0, 50) + '...\n';
                    }
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
            onStart: function(evt) {
                if (!gallery.allFoldersLoaded()) {
                    alert('Не все папки загружены, загрузите сначала все папки, потом сможете поменять их местами');
                    return false;
                }
            },
            onEnd: function(evt) {
                if (!gallery.allFoldersLoaded()) {
                    return;
                }
                
                var items = container.querySelectorAll('li.folder-card');
                var newOrder = [];
                for (var i = 0; i < items.length; i++) {
                    var id = items[i].getAttribute('data-id');
                    if (id) {
                        newOrder.push({ id: id, order: i + 1 });
                    }
                }
                
                self.saveFoldersOrder(newOrder);
            }
        });
    },

    saveFoldersOrder: function(newOrder) {
        console.log('Сохраняю порядок одним запросом:', newOrder);
        
        var self = this;
        
        api.reorderFolders(newOrder).then(function(result) {
            if (result && result.success) {
                console.log('✅ Порядок сохранен, обновлено папок:', result.updated);
                self.createBackup('Изменение порядка папок');
            } else {
                console.error('❌ Ошибка сохранения:', result);
                alert('Ошибка сохранения порядка! Смотрите консоль.');
            }
        }).catch(function(error) {
            console.error('❌ Ошибка сети:', error);
            alert('Ошибка соединения при сохранении порядка.');
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

    // === НОВОЕ: Загрузка фото с очередью ===
    
    uploadPhoto: function() {
        // Проверяем, не идёт ли уже загрузка в эту папку
        if (this.isUploading && this.uploadQueue.length > 0) {
            var currentFolderId = this.uploadQueue[0].folderId;
            if (gallery.currentFolder && gallery.currentFolder.id !== currentFolderId) {
                // Можно добавить в очередь другой папки
            }
        }
        
        var input = document.getElementById('photo-upload');
        if (input) {
            input.value = '';
            input.click();
        }
    },

    // Вызывается когда пользователь выбрал файлы
    handlePhotoSelection: function(input) {
        var files = Array.from(input.files);
        if (!files.length) return;
        
        if (!gallery.currentFolder) {
            alert('Сначала выберите папку');
            return;
        }
        
        var folderId = gallery.currentFolder.id;
        var folderName = gallery.currentFolder.title;
        
        // Добавляем в очередь
        files.forEach(function(file) {
            admin.uploadQueue.push({
                file: file,
                folderId: folderId,
                folderName: folderName,
                attempts: 0
            });
        });
        
        this.showQueueInterface();
        input.value = '';
        
        // Автостарт если не загружаем
        if (!this.isUploading) {
            this.startUpload();
        }
    },

    // Показываем интерфейс очереди
    showQueueInterface: function() {
        var existing = document.getElementById('upload-queue-panel');
        if (existing) {
            this.updateQueueDisplay();
            return;
        }
        
        var panel = document.createElement('div');
        panel.id = 'upload-queue-panel';
        panel.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#fff;padding:20px;border-radius:8px;box-shadow:0 5px 20px rgba(0,0,0,0.3);z-index:10001;min-width:300px;max-width:400px;';
        
        panel.innerHTML = 
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">' +
                '<h4 style="margin:0;">📤 Очередь загрузки</h4>' +
                '<button onclick="admin.toggleQueuePanel()" style="background:none;border:none;font-size:20px;cursor:pointer;">−</button>' +
            '</div>' +
            '<div id="queue-content">' +
                '<p id="queue-status">Подготовка...</p>' +
                '<div style="width:100%;height:10px;background:#eee;border-radius:5px;overflow:hidden;margin:10px 0;">' +
                    '<div id="queue-bar" style="width:0%;height:100%;background:#27ae60;transition:width 0.3s;"></div>' +
                '</div>' +
                '<p id="queue-count" style="font-size:12px;color:#666;margin:0;">0 в очереди</p>' +
                '<div id="queue-controls" style="margin-top:10px;display:none;">' +
                    '<button onclick="admin.startUpload()" id="btn-start" style="background:#27ae60;color:#fff;border:none;padding:5px 15px;border-radius:4px;cursor:pointer;margin-right:5px;">▶ Старт</button>' +
                    '<button onclick="admin.clearQueue()" style="background:#e74c3c;color:#fff;border:none;padding:5px 15px;border-radius:4px;cursor:pointer;">✕ Очистить</button>' +
                '</div>' +
            '</div>' +
            '<div id="queue-minimized" style="display:none;text-align:center;">' +
                '<p style="margin:0;font-size:12px;" id="queue-mini-text">0 / 0</p>' +
            '</div>';
        
        document.body.appendChild(panel);
        this.updateQueueDisplay();
    },

    toggleQueuePanel: function() {
        var panel = document.getElementById('upload-queue-panel');
        var content = document.getElementById('queue-content');
        var minimized = document.getElementById('queue-minimized');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            minimized.style.display = 'none';
        } else {
            content.style.display = 'none';
            minimized.style.display = 'block';
            this.updateMiniText();
        }
    },

    updateMiniText: function() {
        var el = document.getElementById('queue-mini-text');
        if (el) {
            el.textContent = this.uploadStats.uploaded + ' / ' + this.uploadStats.total;
        }
    },

    updateQueueDisplay: function() {
        var status = document.getElementById('queue-status');
        var bar = document.getElementById('queue-bar');
        var count = document.getElementById('queue-count');
        var controls = document.getElementById('queue-controls');
        var btnStart = document.getElementById('btn-start');
        
        if (!status) return;
        
        var remaining = this.uploadQueue.length;
        var total = this.uploadStats.total;
        var done = this.uploadStats.uploaded;
        var failed = this.uploadStats.failed;
        
        if (this.isUploading) {
            var current = this.uploadStats.currentFile ? this.uploadStats.currentFile.name : '...';
            status.textContent = 'Загрузка: ' + current;
            var percent = total > 0 ? Math.round((done / total) * 100) : 0;
            bar.style.width = percent + '%';
            count.textContent = 'Выполнено: ' + done + ' / ' + total + (failed > 0 ? ' (ошибок: ' + failed + ')' : '') + ' | Осталось: ' + remaining;
            controls.style.display = 'none';
        } else if (remaining > 0) {
            status.textContent = 'В очереди: ' + remaining + ' фото';
            bar.style.width = '0%';
            count.textContent = 'Готово к загрузке';
            controls.style.display = 'block';
            if (btnStart) btnStart.style.display = 'inline-block';
        } else {
            status.textContent = '✅ Все фото загружены';
            bar.style.width = '100%';
            count.textContent = 'Успешно: ' + done + ' | Ошибок: ' + failed;
            controls.style.display = 'none';
            
            // Автозакрытие через 3 секунды если нет ошибок
            if (failed === 0 && done > 0) {
                setTimeout(function() {
                    var panel = document.getElementById('upload-queue-panel');
                    if (panel) panel.remove();
                }, 3000);
            }
        }
        
        this.updateMiniText();
    },

    clearQueue: function() {
        if (this.isUploading) {
            alert('Нельзя очистить во время загрузки. Остановите сначала.');
            return;
        }
        this.uploadQueue = [];
        this.uploadStats = { total: 0, uploaded: 0, failed: 0, currentFile: null };
        this.updateQueueDisplay();
    },

    // === ОСНОВНАЯ ЛОГИКА ЗАГРУЗКИ ===
    
    startUpload: function() {
        if (this.isUploading || this.uploadQueue.length === 0) return;
        
        this.isUploading = true;
        this.uploadPaused = false;
        
        // Считаем общее количество для прогресса
        if (this.uploadStats.total === 0) {
            this.uploadStats.total = this.uploadQueue.length;
        }
        
        this.updateQueueDisplay();
        this.processQueue();
    },

    processQueue: function() {
        var self = this;
        
        if (this.uploadPaused || this.uploadQueue.length === 0) {
            this.finishUpload();
            return;
        }
        
        // Берём следующий файл
        var item = this.uploadQueue[0];
        this.uploadStats.currentFile = item.file;
        this.updateQueueDisplay();
        
        // Сбрасываем таймер бездействия (загрузка = активность)
        this.resetInactivityTimer();
        
        // Загружаем с ретраями
        this.tryUploadFile(item, 1).then(function(success) {
            // Удаляем из очереди в любом случае
            self.uploadQueue.shift();
            
            if (success) {
                self.uploadStats.uploaded++;
            } else {
                self.uploadStats.failed++;
                // Останавливаемся при ошибке
                self.uploadPaused = true;
                self.showErrorDialog(item);
                return;
            }
            
            self.updateQueueDisplay();
            
            // Пауза перед следующим файлом
            var pauseTime = 3000; // 3 секунды базово
            if (self.uploadStats.uploaded % 5 === 0) {
                pauseTime = 10000; // 10 секунд каждые 5 фото
                console.log('Пауза 10 секунд после 5 фото');
            }
            
            setTimeout(function() {
                self.processQueue();
            }, pauseTime);
        });
    },

    tryUploadFile: function(item, attempt) {
        var self = this;
        var maxAttempts = 3;
        var timeoutMs = 30000; // 30 секунд таймаут
        
        console.log('Загрузка:', item.file.name, 'попытка', attempt);
        
        return new Promise(function(resolve) {
            var timeoutId = setTimeout(function() {
                console.error('Таймаут:', item.file.name);
                resolve(false); // Таймаут = неуспех
            }, timeoutMs);
            
            api.uploadPhoto(item.folderId, item.file).then(function(result) {
                clearTimeout(timeoutId);
                
                if (result && result.id) {
                    console.log('Успех:', item.file.name, 'ID:', result.id);
                    resolve(true);
                } else {
                    console.error('Нет ID:', item.file.name, result);
                    if (attempt < maxAttempts) {
                        setTimeout(function() {
                            resolve(self.tryUploadFile(item, attempt + 1));
                        }, 2000);
                    } else {
                        resolve(false);
                    }
                }
            }).catch(function(error) {
                clearTimeout(timeoutId);
                console.error('Ошибка:', item.file.name, error);
                
                if (attempt < maxAttempts) {
                    setTimeout(function() {
                        resolve(self.tryUploadFile(item, attempt + 1));
                    }, 2000);
                } else {
                    resolve(false);
                }
            });
        });
    },

    showErrorDialog: function(failedItem) {
        var self = this;
        var fileName = failedItem.file.name;
        
        // Создаём модальное окно
        var modal = document.createElement('div');
        modal.id = 'upload-error-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10003;display:flex;align-items:center;justify-content:center;';
        
        modal.innerHTML = 
            '<div style="background:#fff;padding:30px;border-radius:8px;max-width:400px;text-align:center;">' +
                '<h3 style="color:#e74c3c;margin-top:0;">⚠️ Ошибка загрузки</h3>' +
                '<p>Файл <strong>' + fileName + '</strong> не загрузился после 3 попыток.</p>' +
                '<p style="color:#666;font-size:14px;">Осталось в очереди: ' + this.uploadQueue.length + '</p>' +
                '<div style="margin-top:20px;">' +
                    '<button id="btn-retry" style="background:#27ae60;color:#fff;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;margin-right:10px;">🔄 Повторить</button>' +
                    '<button id="btn-skip" style="background:#e67e22;color:#fff;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;margin-right:10px;">⏭ Пропустить</button>' +
                    '<button id="btn-stop" style="background:#e74c3c;color:#fff;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;">✕ Стоп</button>' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(modal);
        
        // Обработчики
        document.getElementById('btn-retry').onclick = function() {
            document.body.removeChild(modal);
            // Возвращаем в начало очереди
            self.uploadQueue.unshift(failedItem);
            self.uploadStats.failed--;
            self.uploadPaused = false;
            self.processQueue();
        };
        
        document.getElementById('btn-skip').onclick = function() {
            document.body.removeChild(modal);
            // Пропускаем, файл уже удалён из очереди
            self.uploadPaused = false;
            self.processQueue();
        };
        
        document.getElementById('btn-stop').onclick = function() {
            document.body.removeChild(modal);
            self.uploadQueue = []; // Очищаем всё
            self.finishUpload();
        };
    },

    finishUpload: function() {
        this.isUploading = false;
        this.uploadStats.currentFile = null;
        this.updateQueueDisplay();
        
        // Обновляем текущую папку если она открыта
        if (gallery.currentFolder && this.uploadStats.uploaded > 0) {
            gallery.loadPhotos(gallery.currentFolder.id);
        }
        
        // Сбрасываем статистику для следующей партии
        var self = this;
        setTimeout(function() {
            if (!self.isUploading && self.uploadQueue.length === 0) {
                self.uploadStats = { total: 0, uploaded: 0, failed: 0, currentFile: null };
            }
        }, 5000);
    },

    // === МАССОВОЕ УДАЛЕНИЕ ФОТО ===
    
    selectedPhotos: [],

    // Вызывается из gallery.js когда рендерятся фото
    initPhotoSelection: function() {
        var self = this;
        var container = document.getElementById('photos-container');
        if (!container) return;
        
        // Добавляем кнопку "Выбрать все" если её нет
        var toolbar = document.getElementById('photo-toolbar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'photo-toolbar';
            toolbar.style.cssText = 'margin-bottom:15px;padding:10px;background:#f8f9fa;border-radius:5px;display:none;';
            
            var selectAllBtn = document.createElement('button');
            selectAllBtn.id = 'btn-select-all';
            selectAllBtn.textContent = '☐ Выбрать все';
            selectAllBtn.style.cssText = 'background:#3498db;color:#fff;border:none;padding:8px 15px;border-radius:4px;cursor:pointer;margin-right:10px;';
            selectAllBtn.onclick = function() { self.toggleSelectAll(); };
            
            var deleteSelectedBtn = document.createElement('button');
            deleteSelectedBtn.id = 'btn-delete-selected';
            deleteSelectedBtn.textContent = '🗑 Удалить выбранные (0)';
            deleteSelectedBtn.style.cssText = 'background:#e74c3c;color:#fff;border:none;padding:8px 15px;border-radius:4px;cursor:pointer;';
            deleteSelectedBtn.onclick = function() { self.deleteSelectedPhotos(); };
            
            var cancelBtn = document.createElement('button');
            cancelBtn.textContent = '✕ Отмена';
            cancelBtn.style.cssText = 'background:#95a5a6;color:#fff;border:none;padding:8px 15px;border-radius:4px;cursor:pointer;margin-left:10px;';
            cancelBtn.onclick = function() { self.exitSelectionMode(); };
            
            toolbar.appendChild(selectAllBtn);
            toolbar.appendChild(deleteSelectedBtn);
            toolbar.appendChild(cancelBtn);
            
            // Вставляем перед сеткой фото
            var grid = document.getElementById('photos-grid');
            if (grid && grid.parentNode) {
                grid.parentNode.insertBefore(toolbar, grid);
            }
        }
    },

    enterSelectionMode: function() {
        this.selectedPhotos = [];
        this.updateToolbar();
        
        var toolbar = document.getElementById('photo-toolbar');
        if (toolbar) toolbar.style.display = 'block';
        
        // Добавляем чекбоксы к фото
        var photos = document.querySelectorAll('.photo-item');
        photos.forEach(function(photo) {
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
        });
    },

    exitSelectionMode: function() {
        this.selectedPhotos = [];
        
        var toolbar = document.getElementById('photo-toolbar');
        if (toolbar) toolbar.style.display = 'none';
        
        // Убираем чекбоксы
        var checkboxes = document.querySelectorAll('.photo-checkbox');
        checkboxes.forEach(function(cb) { cb.remove(); });
    },

    toggleSelectAll: function() {
        var allPhotos = document.querySelectorAll('.photo-item');
        var checkboxes = document.querySelectorAll('.photo-checkbox');
        var btn = document.getElementById('btn-select-all');
        
        // Проверяем, все ли выбраны
        var allSelected = this.selectedPhotos.length === allPhotos.length && allPhotos.length > 0;
        
        if (allSelected) {
            // Снимаем все
            this.selectedPhotos = [];
            checkboxes.forEach(function(cb) {
                cb.innerHTML = '';
                cb.style.background = '#fff';
            });
            btn.textContent = '☐ Выбрать все';
        } else {
            // Выбираем все
            this.selectedPhotos = [];
            allPhotos.forEach(function(photo, index) {
                var photoId = photo.getAttribute('data-id');
                if (photoId) {
                    admin.selectedPhotos.push(photoId);
                    if (checkboxes[index]) {
                        checkboxes[index].innerHTML = '✓';
                        checkboxes[index].style.background = '#27ae60';
                        checkboxes[index].style.color = '#fff';
                    }
                }
            });
            btn.textContent = '☑ Снять выбор';
        }
        
        this.updateToolbar();
    },

    togglePhotoSelection: function(photoId, checkbox) {
        var index = this.selectedPhotos.indexOf(photoId);
        
        if (index > -1) {
            // Убираем из выбора
            this.selectedPhotos.splice(index, 1);
            checkbox.innerHTML = '';
            checkbox.style.background = '#fff';
        } else {
            // Добавляем в выбор
            this.selectedPhotos.push(photoId);
            checkbox.innerHTML = '✓';
            checkbox.style.background = '#27ae60';
            checkbox.style.color = '#fff';
        }
        
        // Обновляем кнопку "Выбрать все"
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
        var deleted = 0;
        var errors = 0;
        
        // Удаляем последовательно
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
            
            api.deletePhoto(photoId).then(function(result) {
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

// === ИНИЦИАЛИЗАЦИЯ ===

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
    
    // Предупреждение при закрытии страницы во время загрузки
    window.addEventListener('beforeunload', function(e) {
        if (admin.isUploading && admin.uploadQueue.length > 0) {
            e.preventDefault();
            e.returnValue = 'Загрузка фото идёт. Уйти со страницы?';
        }
    });
});
