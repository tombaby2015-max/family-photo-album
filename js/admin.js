// admin.js — админ-панель (полностью исправленная версия выбора фото)

var admin = {
    inactivityTimer: null,
    inactivityTimeout: 15 * 60 * 1000,
    isAdminActive: false,
  
    // === СОСТОЯНИЕ ВЫБОРА ФОТО ===
    isSelectionMode: false,
    selectedPhotos: [], // Просто массив ID выбранных фото
  
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

        // === МАССОВОЕ УДАЛЕНИЕ (УПРОЩЕННАЯ ЛОГИКА) ===
    
    // Вход в режим выбора
    enterSelectionMode: function() {
        console.log('Enter selection mode');
        this.isSelectionMode = true;
        this.selectedPhotos = [];
       
        // Показываем панель инструментов, скрываем кнопку входа
        var enterBtn = document.getElementById('btn-enter-selection');
        var toolbar = document.getElementById('selection-toolbar');
       
        if (enterBtn) enterBtn.style.display = 'none';
        if (toolbar) toolbar.style.display = 'flex';
       
        // Добавляем чекбоксы к фото
        this.renderCheckboxes();
        this.updateSelectionUI();
    },
   
    // Выход из режима выбора
    exitSelectionMode: function() {
        console.log('Exit selection mode');
        this.isSelectionMode = false;
        this.selectedPhotos = [];
       
        // Показываем кнопку входа, скрываем панель инструментов
        var enterBtn = document.getElementById('btn-enter-selection');
        var toolbar = document.getElementById('selection-toolbar');
       
        if (enterBtn) enterBtn.style.display = 'block';
        if (toolbar) toolbar.style.display = 'none';
       
        // Убираем чекбоксы
        this.removeCheckboxes();
    },

    // ... (остальные методы без изменений из предыдущего ответа) ...
   
    // Отрисовка чекбоксов на всех фото
    renderCheckboxes: function() {
        var photos = document.querySelectorAll('.photo-item');
        var self = this;
       
        for (var i = 0; i < photos.length; i++) {
            var photo = photos[i];
            
            // Удаляем старый чекбокс если есть
            var oldCheckbox = photo.querySelector('.photo-checkbox-custom');
            if (oldCheckbox) oldCheckbox.remove();
            
            var photoId = photo.getAttribute('data-id');
            if (!photoId) continue;
           
            // Создаём чекбокс
            var checkbox = document.createElement('div');
            checkbox.className = 'photo-checkbox-custom';
            checkbox.setAttribute('data-photo-id', photoId);
            
            // Проверяем, выбрано ли это фото
            if (self.selectedPhotos.indexOf(photoId) > -1) {
                checkbox.classList.add('checked');
                checkbox.innerHTML = '✓';
            }
           
            // Обработчик клика
            checkbox.onclick = function(e) {
                e.stopPropagation();
                e.preventDefault();
                var id = this.getAttribute('data-photo-id');
                self.togglePhotoSelection(id);
            };
           
            photo.appendChild(checkbox);
            photo.style.position = 'relative'; // Важно для позиционирования чекбокса
        }
    },
   
    // Удаление всех чекбоксов
    removeCheckboxes: function() {
        var checkboxes = document.querySelectorAll('.photo-checkbox-custom');
        for (var i = 0; i < checkboxes.length; i++) {
            checkboxes[i].remove();
        }
    },
   
    // Обновление визуального состояния чекбоксов
    updateCheckboxesVisual: function() {
        var checkboxes = document.querySelectorAll('.photo-checkbox-custom');
        for (var i = 0; i < checkboxes.length; i++) {
            var checkbox = checkboxes[i];
            var photoId = checkbox.getAttribute('data-photo-id');
            
            if (this.selectedPhotos.indexOf(photoId) > -1) {
                checkbox.classList.add('checked');
                checkbox.innerHTML = '✓';
            } else {
                checkbox.classList.remove('checked');
                checkbox.innerHTML = '';
            }
        }
    },
   
    // Выбрать все / Снять все
    toggleSelectAll: function() {
        var total = gallery.currentPhotos.length;
        var currentCount = this.selectedPhotos.length;
        
        if (currentCount === total) {
            // Все выбраны — снимаем все
            this.selectedPhotos = [];
        } else {
            // Выбираем все
            this.selectedPhotos = [];
            for (var i = 0; i < gallery.currentPhotos.length; i++) {
                this.selectedPhotos.push(gallery.currentPhotos[i].id);
            }
        }
        
        this.updateCheckboxesVisual();
        this.updateSelectionUI();
    },
   
    // Переключение выбора одного фото
    togglePhotoSelection: function(photoId) {
        var index = this.selectedPhotos.indexOf(photoId);
        
        if (index > -1) {
            // Уже выбрано — убираем
            this.selectedPhotos.splice(index, 1);
        } else {
            // Не выбрано — добавляем
            this.selectedPhotos.push(photoId);
        }
        
        this.updateCheckboxesVisual();
        this.updateSelectionUI();
    },
   
    // Обновление UI (кнопки и счетчик)
    updateSelectionUI: function() {
        var count = this.selectedPhotos.length;
        var total = gallery.currentPhotos.length;
        
        // Кнопка удаления
        var deleteBtn = document.getElementById('btn-delete-selected');
        if (deleteBtn) {
            deleteBtn.textContent = 'Удалить выбранные (' + count + ')';
            deleteBtn.disabled = count === 0;
            deleteBtn.style.opacity = count === 0 ? '0.5' : '1';
        }
        
        // Кнопка "Выбрать все / Снять все"
        var selectAllBtn = document.getElementById('btn-select-all');
        if (selectAllBtn) {
            if (count === total && total > 0) {
                selectAllBtn.textContent = 'Снять все выделения';
            } else {
                selectAllBtn.textContent = 'Выбрать все';
            }
        }
    },
   
    // Удаление выбранных фото
    deleteSelectedPhotos: function() {
        var folderId = gallery.currentFolder ? gallery.currentFolder.id : null;
        if (!folderId || this.selectedPhotos.length === 0) return;
       
        if (!confirm('Удалить ' + this.selectedPhotos.length + ' фото?')) return;
        
        var self = this;
        var ids = this.selectedPhotos.slice(); // Копия массива
        var deleted = 0;
        
        function deleteNext() {
            if (ids.length === 0) {
                self.exitSelectionMode();
                gallery.loadPhotos(folderId);
                alert('Удалено: ' + deleted);
                return;
            }
            
            var photoId = ids.shift();
            api.deletePhoto(folderId, photoId).then(function() {
                deleted++;
                deleteNext();
            }).catch(function() {
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
      
        var currentPhoto = gallery.visiblePhotos[gallery.currentPhotoIndex];
        if (!currentPhoto || !currentPhoto.file_id) {
            alert('Ошибка: не найдено фото');
            return;
        }
      
        var self = this;
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
    
    // === ОЧИСТКА ХРАНИЛИЩА ===
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
            if (!confirm('⚠️ Это удалит ВСЕ папки и фото из хранилища.\nАдмин-токены останутся.\n\nПродолжить?')) {
                return;
            }
            api.clearStorage().then(function(result) {
                if (result.success) {
                    alert(
                        '✅ Хранилище очищено\n' +
                        'Папок: ' + result.deletedFolders + '\n' +
                        'Фото: ' + result.deletedPhotos
                    );
                    self.closeClearStorageModal();
                    gallery.loadFolders();
                } else {
                    alert('❌ Ошибка очистки: ' + (result.error || 'unknown'));
                }
            });
        });
    },
    
    reloadPage: function() {
        location.reload(true);
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
          
            html += '<h3>📊 Статистика</h3>';
            html += '<p><strong>Папок:</strong> ' + folders.length + '</p>';
            html += '<p><strong>Фото:</strong> ' + photos.length + '</p>';
          
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
    },
    
    restoreFromBackup: function() {
        var input = document.getElementById('restore-backup-file');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.id = 'restore-backup-file';
            input.accept = '.json';
            input.style.display = 'none';
            document.body.appendChild(input);
        }
        input.onchange = function() {
            var file = input.files[0];
            if (!file) return;
            if (!confirm('⚠️ Восстановить данные из бэкапа?\nТекущие данные будут перезаписаны.')) {
                input.value = '';
                return;
            }
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var backupData = JSON.parse(e.target.result);
                    api.restoreBackup(backupData).then(function(result) {
                        if (result.success) {
                            alert(
                                '♻️ Восстановление завершено\n' +
                                'Папок: ' + result.restoredFolders + '\n' +
                                'Фото: ' + result.restoredPhotos
                            );
                            gallery.loadFolders();
                        } else {
                            alert('❌ Ошибка восстановления: ' + (result.error || 'unknown'));
                        }
                    });
                } catch (err) {
                    alert('❌ Неверный формат файла бэкапа');
                }
            };
            reader.readAsText(file);
            input.value = '';
        };
        input.click();
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
    
    // Привязка обработчиков кнопок выбора фото (на случай если они уже в DOM)
    admin.bindSelectionButtons();
});

// Отдельный метод для привязки обработчиков (можно вызывать после загрузки фото)
admin.bindSelectionButtons = function() {
    // Кнопка "Выбрать фото" (вход в режим)
    var enterBtn = document.getElementById('btn-enter-selection');
    if (enterBtn) {
        enterBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            admin.enterSelectionMode();
            return false;
        };
    }
    
    // Кнопка "Отмена" (выход из режима)
    var cancelBtn = document.getElementById('btn-cancel-selection');
    if (cancelBtn) {
        cancelBtn.onclick = function(e) {
            e.preventDefault();
            admin.exitSelectionMode();
        };
    }
    
    // Кнопка "Выбрать все / Снять все"
    var selectAllBtn = document.getElementById('btn-select-all');
    if (selectAllBtn) {
        selectAllBtn.onclick = function(e) {
            e.preventDefault();
            admin.toggleSelectAll();
        };
    }
    
    // Кнопка "Удалить выбранные"
    var deleteBtn = document.getElementById('btn-delete-selected');
    if (deleteBtn) {
        deleteBtn.onclick = function(e) {
            e.preventDefault();
            admin.deleteSelectedPhotos();
        };
    }
};
