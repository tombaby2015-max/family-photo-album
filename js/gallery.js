var gallery = {
    folders: [],
    currentPhotos: [],
    visiblePhotos: [],
    currentFolder: null,
    currentPhotoIndex: 0,
    editingFolder: null,
    previewState: { x: 50, y: 50, scale: 100 },
    keyHandler: null,
    
    // Новые переменные для пагинации
    foldersOffset: 0,
    foldersHasMore: false,
    photosOffset: 0,
    photosHasMore: false,
    isLoadingMore: false,

    init: function() {
        var self = this;
        var hash = window.location.hash;
        if (hash && hash.indexOf('folder=') !== -1) {
            var folderId = hash.split('folder=')[1];
            // Сначала загружаем папки, чтобы найти нужную
            api.getFolders(0).then(function(response) {
                self.folders = response.folders || [];
                self.foldersHasMore = response.hasMore || false;
                self.foldersOffset = self.folders.length;
                
                var folder = null;
                for (var i = 0; i < self.folders.length; i++) {
                    if (self.folders[i].id === folderId) {
                        folder = self.folders[i];
                        break;
                    }
                }
                
                // Если не нашли в первых 40, ищем дальше (для админа может быть скрытая)
                if (!folder && self.foldersHasMore) {
                    self.loadMoreFolders(function() {
                        self.findFolderAndOpen(folderId, false);
                    });
                } else if (folder) {
                    self.openFolder(folder, false);
                } else {
                    self.showMainPage();
                }
            });
        } else {
            this.loadFolders();
        }
    },

    findFolderAndOpen: function(folderId, updateHash) {
        var folder = null;
        for (var i = 0; i < this.folders.length; i++) {
            if (this.folders[i].id === folderId) {
                folder = this.folders[i];
                break;
            }
        }
        if (folder) {
            this.openFolder(folder, updateHash);
        } else if (this.foldersHasMore) {
            this.loadMoreFolders(function() {
                gallery.findFolderAndOpen(folderId, updateHash);
            });
        } else {
            this.showMainPage();
        }
    },

    loadFolders: function() {
        var self = this;
        this.foldersOffset = 0;
        this.folders = [];
        
        var container = document.getElementById('folders-container');
        if (container) container.innerHTML = '<li class="loading">Загрузка папок...</li>';
        
        api.getFolders(0).then(function(response) {
            self.folders = response.folders || [];
            self.foldersHasMore = response.hasMore || false;
            self.foldersOffset = self.folders.length;
            
            if (self.folders.length === 0) {
                if (container) container.innerHTML = '<li class="empty-state"><h4>Папок пока нет</h4></li>';
                return;
            }
            
            self.renderFolders();
            self.initSortable();
        });
    },

    renderFolders: function() {
        var self = this;
        var container = document.getElementById('folders-container');
        if (!container) return;
        
        // Убираем "Загрузка..." и кнопку "Загрузить ещё" если есть
        var existingLoadMore = document.getElementById('load-more-folders');
        if (existingLoadMore) existingLoadMore.remove();
        
        var html = self.folders.map(function(folder) {
            return self.createFolderCard(folder);
        }).join('');
        
        if (container.querySelector('.loading')) {
            container.innerHTML = html;
        } else {
            container.insertAdjacentHTML('beforeend', html);
        }
        
        // Навешиваем обработчики кликов
        for (var i = 0; i < self.folders.length; i++) {
            (function(folder) {
                var card = document.getElementById('folder-' + folder.id);
                if (card) {
                    card.onclick = function(e) {
                        if (self.editingFolder) return;
                        if (e.target.closest('.folder-card__admin-actions')) return;
                        if (e.target.closest('.preview-editor')) return;
                        self.openFolder(folder);
                    };
                }
            })(self.folders[i]);
        }
        
        // Добавляем кнопку "Загрузить ещё" если нужно
        if (self.foldersHasMore) {
            var loadMoreHtml = '<li id="load-more-folders" class="t214__col t-item t-card__col t-col t-col_4" style="cursor:pointer;">' +
                '<div style="height:280px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.05);border-radius:4px;transition:background 0.3s;" onmouseover="this.style.background=\'rgba(0,0,0,0.1)\'" onmouseout="this.style.background=\'rgba(0,0,0,0.05)\'">' +
                    '<span style="color:#666;font-size:16px;">+ Загрузить ещё папки</span>' +
                '</div>' +
            '</li>';
            container.insertAdjacentHTML('beforeend', loadMoreHtml);
            
            document.getElementById('load-more-folders').onclick = function() {
                self.loadMoreFolders();
            };
        }
        
        // Инициализируем сортировку если все загружено
        if (!self.foldersHasMore && api.isAdmin()) {
            if (typeof admin !== 'undefined') {
                admin.initSortable();
            }
        }
    },

    loadMoreFolders: function(callback) {
        var self = this;
        if (this.isLoadingMore || !this.foldersHasMore) return;
        
        this.isLoadingMore = true;
        var loadMoreBtn = document.getElementById('load-more-folders');
        if (loadMoreBtn) {
            loadMoreBtn.querySelector('span').textContent = 'Загружается...';
        }
        
        api.getFolders(this.foldersOffset).then(function(response) {
            var newFolders = response.folders || [];
            self.foldersHasMore = response.hasMore || false;
            self.foldersOffset += newFolders.length;
            
            // Добавляем новые папки к существующим
            self.folders = self.folders.concat(newFolders);
            
            self.isLoadingMore = false;
            self.renderFolders();
            
            if (callback) callback();
        }).catch(function() {
            self.isLoadingMore = false;
            if (loadMoreBtn) {
                loadMoreBtn.querySelector('span').textContent = '+ Загрузить ещё папки';
            }
        });
    },

    createFolderCard: function(folder) {
        var isAdmin = api.isAdmin();
        var isEditing = this.editingFolder === folder.id;
        var hiddenClass = folder.hidden ? 'hidden-folder' : '';
        
        var bgStyle = this.getFolderBackgroundStyle(folder);
        
        var adminActions = '';
        if (isAdmin && !isEditing) {
            adminActions = '<div class="folder-card__admin-actions">' +
                '<button onclick="event.stopPropagation(); admin.toggleFolderHidden(\'' + folder.id + '\', ' + !folder.hidden + ')" title="' + (folder.hidden ? 'Показать' : 'Скрыть') + '">' + (folder.hidden ? '👁' : '🙈') + '</button>' +
                '<button onclick="event.stopPropagation(); admin.renameFolder(\'' + folder.id + '\', \'' + folder.title + '\')" title="Переименовать">✏️</button>' +
                '<button onclick="event.stopPropagation(); admin.deleteFolder(\'' + folder.id + '\')" title="Удалить">🗑️</button>' +
                '<button onclick="event.stopPropagation(); gallery.startEditPreview(\'' + folder.id + '\')" title="Редактировать превью">🖼️</button>' +
            '</div>';
        }
        
        var previewEditor = '';
        if (isEditing) {
            previewEditor = '<div class="preview-editor">' +
                '<button class="preview-editor__btn up" onclick="gallery.movePreview(0, -10)" title="Вверх">↑</button>' +
                '<button class="preview-editor__btn down" onclick="gallery.movePreview(0, 10)" title="Вниз">↓</button>' +
                '<button class="preview-editor__btn left" onclick="gallery.movePreview(-10, 0)" title="Влево">←</button>' +
                '<button class="preview-editor__btn right" onclick="gallery.movePreview(10, 0)" title="Вправо">→</button>' +
                '<button class="preview-editor__btn zoom-out" onclick="gallery.zoomPreview(-10)" title="Уменьшить">−</button>' +
                '<button class="preview-editor__btn zoom-in" onclick="gallery.zoomPreview(10)" title="Увеличить">+</button>' +
                '<button class="preview-editor__btn save" onclick="gallery.savePreview()" title="Сохранить">Сохранить</button>' +
            '</div>';
        }
        
        return '<li id="folder-' + folder.id + '" class="t214__col t-item t-card__col t-col t-col_4 folder-card ' + hiddenClass + (isEditing ? ' editing' : '') + '" data-id="' + folder.id + '">' +
            '<div class="folder-card__image" id="folder-image-' + folder.id + '" style="' + bgStyle + '">' +
                '<div class="folder-card__title">' + folder.title + '</div>' +
                adminActions +
                previewEditor +
            '</div>' +
        '</li>';
    },

    getFolderBackgroundStyle: function(folder) {
        var imageUrl = folder.cover_url || 'https://static.tildacdn.ink/tild3730-6566-4766-b165-306164333335/photo-1499002238440-.jpg';
        
        if (this.editingFolder === folder.id) {
            var x = this.previewState.x;
            var y = this.previewState.y;
            var scale = this.previewState.scale;
            return 'background-image: url(\'' + imageUrl + '\'); background-position: ' + x + '% ' + y + '%; background-size: ' + scale + '%;';
        }
        
        var x = folder.cover_x !== undefined ? folder.cover_x : 50;
        var y = folder.cover_y !== undefined ? folder.cover_y : 50;
        var scale = folder.cover_scale !== undefined ? folder.cover_scale : 100;
        
        return 'background-image: url(\'' + imageUrl + '\'); background-position: ' + x + '% ' + y + '%; background-size: ' + scale + '%;';
    },

    startEditPreview: function(folderId) {
        var folder = null;
        for (var i = 0; i < this.folders.length; i++) {
            if (this.folders[i].id === folderId) {
                folder = this.folders[i];
                break;
            }
        }
        if (!folder) return;
        
        if (!folder.cover_url) {
            alert('Сначала выберите фото для превью папки (зайдите в папку и нажмите "Превью папки" на фото)');
            return;
        }
        
        this.editingFolder = folderId;
        this.previewState = {
            x: folder.cover_x !== undefined ? folder.cover_x : 50,
            y: folder.cover_y !== undefined ? folder.cover_y : 50,
            scale: folder.cover_scale !== undefined ? folder.cover_scale : 100
        };
        
        this.renderFolders();
    },

    movePreview: function(dx, dy) {
        this.previewState.x = Math.max(0, Math.min(100, this.previewState.x + dx));
        this.previewState.y = Math.max(0, Math.min(100, this.previewState.y + dy));
        this.updatePreviewDisplay();
    },

    zoomPreview: function(delta) {
        this.previewState.scale = Math.max(50, Math.min(200, this.previewState.scale + delta));
        this.updatePreviewDisplay();
    },

    updatePreviewDisplay: function() {
        var imageEl = document.getElementById('folder-image-' + this.editingFolder);
        if (imageEl) {
            imageEl.style.backgroundPosition = this.previewState.x + '% ' + this.previewState.y + '%';
            imageEl.style.backgroundSize = this.previewState.scale + '%';
        }
    },

    savePreview: function() {
        var self = this;
        var folderId = this.editingFolder;
        
        api.updateFolder(folderId, {
            cover_x: this.previewState.x,
            cover_y: this.previewState.y,
            cover_scale: this.previewState.scale
        }).then(function(result) {
            if (result) {
                for (var i = 0; i < self.folders.length; i++) {
                    if (self.folders[i].id === folderId) {
                        self.folders[i].cover_x = self.previewState.x;
                        self.folders[i].cover_y = self.previewState.y;
                        self.folders[i].cover_scale = self.previewState.scale;
                        break;
                    }
                }
                
                self.editingFolder = null;
                self.renderFolders();
                alert('Превью сохранено!');
            } else {
                alert('Ошибка сохранения');
            }
        });
    },

    openFolder: function(folder, updateHash) {
        if (updateHash !== false) {
            window.location.hash = 'folder=' + folder.id;
        }
        this.currentFolder = folder;
        this.currentPhotos = [];
        this.photosOffset = 0;
        this.photosHasMore = false;
        
        var coverSection = document.getElementById('cover-section');
        var mainPage = document.getElementById('main-page');
        var mainFooter = document.getElementById('main-footer');
        var folderPage = document.getElementById('folder-page');
        var sidebarButtons = document.getElementById('sidebar-admin-buttons');
        var coverImage = document.getElementById('folder-cover-image');
        var titleText = document.getElementById('folder-title-text');
        
        if (coverSection) coverSection.style.display = 'none';
        if (mainPage) mainPage.style.display = 'none';
        if (mainFooter) mainFooter.style.display = 'none';
        if (folderPage) folderPage.style.display = 'block';
        
        if (coverImage) {
            coverImage.style.backgroundImage = "url('https://static.tildacdn.ink/tild3730-6566-4766-b165-306164333335/photo-1499002238440-.jpg')";
        }
        
        if (titleText) titleText.textContent = folder.title;
        
        if (sidebarButtons) {
            sidebarButtons.style.display = api.isAdmin() ? 'flex' : 'none';
        }
        
        this.loadPhotos(folder.id);
        window.scrollTo(0, 0);
    },

    showMainPage: function() {
        this.editingFolder = null;
        
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
        
        window.location.hash = '';
        
        var coverSection = document.getElementById('cover-section');
        var mainPage = document.getElementById('main-page');
        var mainFooter = document.getElementById('main-footer');
        var folderPage = document.getElementById('folder-page');
        
        if (folderPage) folderPage.style.display = 'none';
        if (coverSection) coverSection.style.display = 'block';
        if (mainPage) mainPage.style.display = 'block';
        if (mainFooter) mainFooter.style.display = 'block';
        
        this.currentFolder = null;
        this.currentPhotos = [];
        this.visiblePhotos = [];
        this.photosOffset = 0;
        this.photosHasMore = false;
        
        if (coverSection) {
            window.scrollTo(0, coverSection.offsetHeight);
        }
        this.loadFolders();
    },

    loadPhotos: function(folderId) {
        var self = this;
        this.photosOffset = 0;
        this.currentPhotos = [];
        
        var grid = document.getElementById('photos-grid');
        if (grid) grid.innerHTML = '<div class="loading">Загрузка фото...</div>';
        
        api.getPhotos(folderId, 0).then(function(response) {
            var photos = response.photos || [];
            self.photosHasMore = response.hasMore || false;
            self.photosOffset = photos.length;
            self.currentPhotos = photos;
            
            // Фильтруем для отображения (хотя сервер уже отфильтровал)
            var isAdmin = api.isAdmin();
            self.visiblePhotos = [];
            for (var i = 0; i < photos.length; i++) {
                if (isAdmin || !photos[i].hidden) {
                    self.visiblePhotos.push(photos[i]);
                }
            }
            
            self.renderPhotos();
        });
    },

    renderPhotos: function() {
        var self = this;
        var grid = document.getElementById('photos-grid');
        if (!grid) return;
        
        // Убираем старые "Загрузить ещё" и "Загрузка..."
        var existingLoadMore = document.getElementById('load-more-photos');
        if (existingLoadMore) existingLoadMore.remove();
        
        if (self.visiblePhotos.length === 0) {
            grid.innerHTML = '<div class="empty-state"><h4>В этой папке пока нет фото</h4></div>';
            return;
        }
        
        var html = self.visiblePhotos.map(function(photo, index) {
            return self.createPhotoItem(photo, index);
        }).join('');
        
        if (grid.querySelector('.loading')) {
            grid.innerHTML = html;
        } else {
            grid.insertAdjacentHTML('beforeend', html);
        }
        
        // Добавляем кнопку "Загрузить ещё" если нужно
        if (self.photosHasMore) {
            var loadMoreHtml = '<div id="load-more-photos" class="photo-item" style="cursor:pointer;background:rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;aspect-ratio:auto;height:200px;" onclick="gallery.loadMorePhotos()">' +
                '<span style="color:#666;font-size:14px;">+ Загрузить ещё фотографии</span>' +
            '</div>';
            grid.insertAdjacentHTML('beforeend', loadMoreHtml);
        }
    },

    loadMorePhotos: function() {
        var self = this;
        if (this.isLoadingMore || !this.photosHasMore || !this.currentFolder) return;
        
        this.isLoadingMore = true;
        var loadMoreBtn = document.getElementById('load-more-photos');
        if (loadMoreBtn) {
            loadMoreBtn.querySelector('span').textContent = 'Загружается...';
        }
        
        api.getPhotos(this.currentFolder.id, this.photosOffset).then(function(response) {
            var newPhotos = response.photos || [];
            self.photosHasMore = response.hasMore || false;
            self.photosOffset += newPhotos.length;
            
            // Добавляем к существующим
            self.currentPhotos = self.currentPhotos.concat(newPhotos);
            
            // Фильтруем для отображения
            var isAdmin = api.isAdmin();
            for (var i = 0; i < newPhotos.length; i++) {
                if (isAdmin || !newPhotos[i].hidden) {
                    self.visiblePhotos.push(newPhotos[i]);
                }
            }
            
            self.isLoadingMore = false;
            self.renderPhotos();
        }).catch(function() {
            self.isLoadingMore = false;
            if (loadMoreBtn) {
                loadMoreBtn.querySelector('span').textContent = '+ Загрузить ещё фотографии';
            }
        });
    },

    createPhotoItem: function(photo, index) {
        var isAdmin = api.isAdmin();
        var hiddenClass = photo.hidden ? 'hidden-photo' : '';
        
        var adminActions = '';
        if (isAdmin) {
            adminActions = '<div class="photo-item__admin-actions" onclick="event.stopPropagation()">' +
                '<button onclick="event.stopPropagation(); admin.togglePhotoHidden(\'' + photo.id + '\', ' + !photo.hidden + ')" title="' + (photo.hidden ? 'Показать' : 'Скрыть') + '">' + (photo.hidden ? '👁' : '🙈') + '</button>' +
                '<button onclick="event.stopPropagation(); admin.deletePhoto(\'' + photo.id + '\')" title="Удалить">🗑️</button>' +
            '</div>';
        }
        
        return '<div class="photo-item ' + hiddenClass + '" onclick="gallery.openFullscreen(' + index + ')">' +
            '<img src="' + photo.url + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">' +
            adminActions +
        '</div>';
    },

    openFullscreen: function(index) {
        if (index < 0 || index >= this.visiblePhotos.length) return;
        
        this.currentPhotoIndex = index;
        var photo = this.visiblePhotos[index];
        
        var img = document.getElementById('fullscreen-image');
        var link = document.getElementById('download-link');
        var viewer = document.getElementById('fullscreen-viewer');
        
        var btnCover = document.getElementById('btn-set-cover');
        var btnDelete = document.getElementById('btn-delete-photo');
        
        if (btnCover) btnCover.style.display = api.isAdmin() ? 'inline-block' : 'none';
        if (btnDelete) btnDelete.style.display = api.isAdmin() ? 'inline-block' : 'none';
        
        if (img) img.src = photo.url;
        if (link) link.href = photo.url;
        if (viewer) viewer.style.display = 'flex';
        
        var self = this;
        
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }
        
        this.keyHandler = function(e) {
            if (e.key === 'Escape') {
                self.closeFullscreen();
            } else if (e.key === 'ArrowLeft') {
                self.prevPhoto();
            } else if (e.key === 'ArrowRight') {
                self.nextPhoto();
            }
        };
        document.addEventListener('keydown', this.keyHandler);
    },

    closeFullscreen: function() {
        var viewer = document.getElementById('fullscreen-viewer');
        if (viewer) viewer.style.display = 'none';
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
    },

    prevPhoto: function() {
        if (this.currentPhotoIndex > 0) {
            this.openFullscreen(this.currentPhotoIndex - 1);
        }
    },

    nextPhoto: function() {
        if (this.currentPhotoIndex < this.visiblePhotos.length - 1) {
            this.openFullscreen(this.currentPhotoIndex + 1);
        }
    },
    
    // Проверка для админа: все ли папки загружены (для сортировки)
    allFoldersLoaded: function() {
        return !this.foldersHasMore;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    gallery.init();
});

function scrollToFolders() {
    var mainPage = document.getElementById('main-page');
    if (mainPage) {
        mainPage.scrollIntoView({ behavior: 'smooth' });
    }
}
