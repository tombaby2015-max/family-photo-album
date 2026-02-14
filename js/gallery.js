var gallery = {
    folders: [],
    currentPhotos: [],        // Все фото папки (включая скрытые для админа)
    visiblePhotos: [],        // Только видимые фото (для навигации)
    currentFolder: null,
    currentPhotoIndex: 0,
    editingFolder: null,
    previewState: { x: 50, y: 50, scale: 100 },
    keyHandler: null,         // Добавляем сюда для правильного удаления

    init: function() {
        var self = this;
        var hash = window.location.hash;
        if (hash && hash.indexOf('folder=') !== -1) {
            var folderId = hash.split('folder=')[1];
            api.getFolders().then(function(folders) {
                self.folders = folders;
                var folder = null;
                for (var i = 0; i < folders.length; i++) {
                    if (folders[i].id === folderId) {
                        folder = folders[i];
                        break;
                    }
                }
                if (folder) {
                    self.openFolder(folder, false);
                } else {
                    self.loadFolders();
                }
            });
        } else {
            this.loadFolders();
        }
    },

    loadFolders: function() {
        var self = this;
        var container = document.getElementById('folders-container');
        if (container) container.innerHTML = '<li class="loading">Загрузка папок...</li>';
        
        api.getFolders().then(function(folders) {
            self.folders = folders;
            
            var isAdmin = api.isAdmin();
            var visibleFolders = [];
            for (var i = 0; i < folders.length; i++) {
                if (isAdmin || !folders[i].hidden) {
                    visibleFolders.push(folders[i]);
                }
            }
            
            if (visibleFolders.length === 0) {
                if (container) container.innerHTML = '<li class="empty-state"><h4>Папок пока нет</h4></li>';
                return;
            }
            
            visibleFolders.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
            
            if (container) {
                container.innerHTML = visibleFolders.map(function(folder) {
                    return self.createFolderCard(folder);
                }).join('');
            }
            
            if (isAdmin && typeof admin !== 'undefined') {
                admin.initSortable();
            }
            
            for (var j = 0; j < visibleFolders.length; j++) {
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
                })(visibleFolders[j]);
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
        
        this.loadFolders();
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
                self.loadFolders();
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
        
        // Удаляем обработчик клавиш при выходе из папки
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
        
        if (coverSection) {
            window.scrollTo(0, coverSection.offsetHeight);
        }
        this.loadFolders();
    },

    loadPhotos: function(folderId) {
        var self = this;
        var grid = document.getElementById('photos-grid');
        if (grid) grid.innerHTML = '<div class="loading">Загрузка фото...</div>';
        
        api.getPhotos(folderId).then(function(photos) {
            self.currentPhotos = photos;
            
            // Создаем отфильтрованный массив только для отображения
            var isAdmin = api.isAdmin();
            self.visiblePhotos = [];
            for (var i = 0; i < photos.length; i++) {
                if (isAdmin || !photos[i].hidden) {
                    self.visiblePhotos.push(photos[i]);
                }
            }
            
            if (self.visiblePhotos.length === 0) {
                if (grid) grid.innerHTML = '<div class="empty-state"><h4>В этой папке пока нет фото</h4></div>';
                return;
            }
            
            if (grid) {
                grid.innerHTML = self.visiblePhotos.map(function(photo, index) {
                    return self.createPhotoItem(photo, index);
                }).join('');
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
        
        // Удаляем старый обработчик если есть
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
