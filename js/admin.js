var admin = {
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
                gallery.loadFolders();
            } else {
                if (errorEl) errorEl.textContent = result.error || 'Ошибка входа';
            }
        }).catch(function(e) {
            if (errorEl) errorEl.textContent = 'Ошибка соединения';
        });
    },

    logout: function() {
        api.logout();
        this.hideAdminUI();
        gallery.showMainPage();
    },

    showAdminUI: function() {
        var adminPanel = document.getElementById('admin-panel');
        var folderAdminPanel = document.getElementById('folder-admin-panel');
        
        if (adminPanel) adminPanel.style.display = 'block';
        if (folderAdminPanel) folderAdminPanel.style.display = 'block';
        
        gallery.loadFolders();
    },

    hideAdminUI: function() {
        var adminPanel = document.getElementById('admin-panel');
        var folderAdminPanel = document.getElementById('folder-admin-panel');
        
        if (adminPanel) adminPanel.style.display = 'none';
        if (folderAdminPanel) folderAdminPanel.style.display = 'none';
        
        gallery.loadFolders();
    },

    // Drag & Drop сортировка папок
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
            alert('Ошибка сохранения порядка');
        });
    },

    createFolder: function() {
        var title = prompt('Введите название папки:');
        if (!title) return;
        
        api.createFolder(title).then(function(result) {
            if (result && result.id) {
                alert('Папка создана!');
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
        
        api.updateFolder(id, { title: newTitle }).then(function(result) {
            if (result) {
                if (gallery.currentFolder && gallery.currentFolder.id === id) {
                    gallery.currentFolder.title = newTitle;
                    var coverTitle = document.getElementById('folder-cover-title');
                    if (coverTitle) coverTitle.textContent = newTitle;
                }
                gallery.loadFolders();
            } else {
                alert('Ошибка при переименовании');
            }
        }).catch(function(e) {
            alert('Ошибка при переименовании');
        });
    },

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

    deleteFolder: function(folderId) {
        var id = folderId || (gallery.currentFolder ? gallery.currentFolder.id : null);
        if (!id) return;
        
        if (!confirm('Удалить папку? Все фото в ней будут удалены. Это действие нельзя отменить.')) return;
        
        api.deleteFolder(id).then(function(result) {
            if (result) {
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

        // Установить текущее фото как превью папки
    setFolderCover: function() {
        var img = document.getElementById('fullscreen-image');
        if (!img || !img.src || !gallery.currentFolder) return;
        
        var photoUrl = img.src;
        var folderId = gallery.currentFolder.id;
        
        api.updateFolder(folderId, { cover_url: photoUrl }).then(function(result) {
            if (result) {
                // Обновляем локально
                gallery.currentFolder.cover_url = photoUrl;
                
                // Обновляем отображение на странице папки (верхняя полоска)
                var coverImage = document.querySelector('.folder-cover-strip__image');
                if (coverImage) {
                    coverImage.style.backgroundImage = "url('" + photoUrl + "')";
                }
                
                alert('Превью папки обновлено!');
                gallery.closeFullscreen();
                
                // Обновляем отображение в списке папок
                setTimeout(function() {
                    gallery.loadFolders();
                }, 500);
            } else {
                alert('Ошибка обновления превью');
            }
        }).catch(function(e) {
            alert('Ошибка обновления превью');
        });
    },

    // Удалить текущее фото из fullscreen
    deleteCurrentPhoto: function() {
        if (gallery.currentPhotos.length === 0 || gallery.currentPhotoIndex < 0) return;
        
        var photo = gallery.currentPhotos[gallery.currentPhotoIndex];
        if (!photo) return;
        
        if (!confirm('Удалить это фото?')) return;
        
        api.deletePhoto(photo.id).then(function(result) {
            if (result && gallery.currentFolder) {
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
        if (!confirm(hidden ? 'Скрыть фото?' : 'Показать фото?')) return;
        
        api.updatePhoto(photoId, { hidden: hidden }).then(function(result) {
            if (result && gallery.currentFolder) {
                gallery.loadPhotos(gallery.currentFolder.id);
            } else {
                alert('Ошибка');
            }
        }).catch(function(e) {
            alert('Ошибка');
        });
    },

    deletePhoto: function(photoId) {
        if (!confirm('Удалить фото? Это действие нельзя отменить.')) return;
        
        api.deletePhoto(photoId).then(function(result) {
            if (result && gallery.currentFolder) {
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
    }
    
    var passwordInput = document.getElementById('admin-password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') admin.login();
        });
    }
});
