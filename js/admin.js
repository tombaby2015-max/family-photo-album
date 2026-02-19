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

    uploadPhoto: function() {
        var input = document.getElementById('photo-upload');
        if (input) {
            input.value = '';
            input.click();
        }
    },

    // ПОЛНОСТЬЮ ПЕРЕПИСАННЫЙ МЕТОД - последовательная загрузка с ретраями
    handlePhotoUpload: function(input) {
        var self = this;
        var files = Array.from(input.files);
        
        if (!files.length) return;
        
        var folderId = gallery.currentFolder.id;
        var total = files.length;
        var uploaded = 0;
        var failed = 0;
        var currentIndex = 0;
        var retryQueue = []; // Очередь для повторных попыток
        
        // Создаем прогресс-бар
        var progressDiv = document.createElement('div');
        progressDiv.id = 'upload-progress';
        progressDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:30px;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.3);z-index:10002;text-align:center;max-width:400px;';
        progressDiv.innerHTML = 
            '<h3>Загрузка фотографий</h3>' +
            '<p id="upload-status">Подготовка...</p>' +
            '<div style="width:300px;height:20px;background:#eee;border-radius:10px;overflow:hidden;margin:15px 0;">' +
                '<div id="upload-bar" style="width:0%;height:100%;background:#27ae60;transition:width 0.3s;"></div>' +
            '</div>' +
            '<p id="upload-count">0 / ' + total + '</p>' +
            '<p id="upload-retry" style="color:#e67e22;font-size:12px;display:none;">Повторная попытка...</p>';
        document.body.appendChild(progressDiv);
        
        function updateProgress() {
            var percent = Math.round(((uploaded + failed) / total) * 100);
            var bar = document.getElementById('upload-bar');
            var count = document.getElementById('upload-count');
            
            if (bar) bar.style.width = percent + '%';
            if (count) count.textContent = uploaded + ' / ' + total + (failed > 0 ? ' (ошибок: ' + failed + ')' : '');
        }
        
        // Функция загрузки одного файла с 3 попытками
        function tryUploadFile(file, attempt) {
            attempt = attempt || 1;
            var maxAttempts = 3;
            
            var statusEl = document.getElementById('upload-status');
            var retryEl = document.getElementById('upload-retry');
            
            if (statusEl) statusEl.textContent = 'Загрузка: ' + file.name + (attempt > 1 ? ' (попытка ' + attempt + ')' : '');
            if (retryEl && attempt > 1) retryEl.style.display = 'block';
            if (retryEl && attempt === 1) retryEl.style.display = 'none';
            
            return api.uploadPhoto(folderId, file).then(function(result) {
                if (result && result.id) {
                    uploaded++;
                    updateProgress();
                    return true;
                } else {
                    throw new Error('Server returned no ID');
                }
            }).catch(function(error) {
                console.error('Ошибка загрузки (попытка ' + attempt + '):', file.name, error);
                
                if (attempt < maxAttempts) {
                    // Ждем 2 секунды и пробуем снова
                    return new Promise(function(resolve) {
                        setTimeout(function() {
                            resolve(tryUploadFile(file, attempt + 1));
                        }, 2000);
                    });
                } else {
                    // Все попытки исчерпаны
                    failed++;
                    updateProgress();
                    console.error('Файл не загружен после ' + maxAttempts + ' попыток:', file.name);
                    return false;
                }
            });
        }
        
        // Последовательная загрузка всех файлов
        function processQueue() {
            if (currentIndex >= files.length) {
                // Все файлы обработаны, пробуем повторно загрузить failed
                if (retryQueue.length > 0 && failed > 0) {
                    console.log('Повторная попытка для failed файлов:', retryQueue.length);
                }
                
                setTimeout(function() {
                    var progressDiv = document.getElementById('upload-progress');
                    if (progressDiv) document.body.removeChild(progressDiv);
                    
                    if (failed > 0) {
                        alert('Загружено: ' + uploaded + ' из ' + total + '\nОшибок: ' + failed + '\n\nПроверьте консоль (F12) для деталей.');
                    } else {
                        alert('✅ Успешно загружено: ' + uploaded + ' фотографий');
                    }
                    
                    gallery.loadPhotos(folderId);
                    input.value = '';
                }, 500);
                return;
            }
            
            var file = files[currentIndex];
            currentIndex++;
            
            // Загружаем с ретраями, потом пауза 1.5 секунды перед следующим
            tryUploadFile(file, 1).then(function() {
                updateProgress();
                // Пауза 1.5 секунды между файлами чтобы не перегружать API
                setTimeout(processQueue, 1500);
            });
        }
        
        // Стартуем загрузку
        processQueue();
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
});
