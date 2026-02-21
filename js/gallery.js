// gallery.js — показывает папки и фото (новая версия)
// Работает с Telegram ID и новой структурой KV

var gallery = {
    folders: [],
    currentPhotos: [],
    visiblePhotos: [],
    currentFolder: null,
    currentPhotoIndex: 0,
    editingFolder: null,
    previewState: { x: 50, y: 50, scale: 100 },
    keyHandler: null,
    lastOpenedFolderId: null,

    init: function() {
        var self = this;
        var hash = window.location.hash;
        if (hash && hash.indexOf('folder=') !== -1) {
            var folderId = hash.split('folder=')[1];
            self.loadFoldersAndOpen(folderId);
        } else {
            this.loadFolders();
        }
    },

    // Загружаем папки и пытаемся открыть нужную
    loadFoldersAndOpen: function(folderId) {
        var self = this;
        api.getFolders().then(function(folders) {
            self.folders = folders;
            self.renderFolders();
            
            // Ищем папку с нужным ID
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
                self.showMainPage();
            }
        });
    },

    // Загружаем все папки
    loadFolders: function() {
        var self = this;
        var container = document.getElementById('folders-container');
        if (container) container.innerHTML = '<li class="loading">Загрузка папок...</li>';
        
        api.getFolders().then(function(folders) {
            self.folders = folders;
            self.renderFolders();
        });
    },

    // Показываем папки на странице
    renderFolders: function() {
        var self = this;
        var container = document.getElementById('folders-container');
        if (!container) return;
        
        if (self.folders.length === 0) {
            container.innerHTML = '<li class="empty-state"><h4>Папок пока нет</h4><p>Создайте тему в Telegram</p></li>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < self.folders.length; i++) {
            html += self.createFolderCard(self.folders[i]);
        }
        
        container.innerHTML = html;
        
        // Добавляем обработчики кликов
        for (var j = 0; j < self.folders.length; j++) {
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
            })(self.folders[j]);
        }
        
        // Подключаем сортировку drag&drop для админа
        if (api.isAdmin() && typeof Sortable !== 'undefined') {
            setTimeout(function() {
                if (typeof admin !== 'undefined') {
                    admin.initSortable();
                }
            }, 100);
        }
    },

    // Создаём HTML для карточки папки
    createFolderCard: function(folder) {
        var isAdmin = api.isAdmin();
        var isEditing = this.editingFolder === folder.id;
        var hiddenClass = folder.hidden ? 'hidden-folder' : '';
        
        var bgStyle = this.getFolderBackgroundStyle(folder);
        
        // Кнопки админа (только для админов)
        var adminActions = '';
        if (isAdmin && !isEditing) {
            adminActions = '<div class="folder-card__admin-actions">' +
                '<button onclick="event.stopPropagation(); admin.toggleFolderHidden(\'' + folder.id + '\', ' + !folder.hidden + ')" title="' + (folder.hidden ? 'Показать' : 'Скрыть') + '">' + (folder.hidden ? '👁' : '🙈') + '</button>' +
                '<button onclick="event.stopPropagation(); admin.renameFolder(\'' + folder.id + '\', \'' + folder.title + '\')" title="Переименовать">✏️</button>' +
                '<button onclick="event.stopPropagation(); admin.deleteFolder(\'' + folder.id + '\')" title="Удалить">🗑️</button>' +
                '<button onclick="event.stopPropagation(); gallery.startEditPreview(\'' + folder.id + '\')" title="Редактировать превью">🖼️</button>' +
            '</div>';
        }
        
        // Редактор положения обложки
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
        
        return '<li id="folder-' + folder.id + '" class="t214__col t-item t-card__col t-col t-col_4 folder-card ' + hiddenClass + (isEditing ? ' editing' : '') + '" data-folder-id="' + folder.id + '">' +
            '<div class="folder-card__image" id="folder-image-' + folder.id + '" style="' + bgStyle + '">' +
                '<div class="folder-card__title">' + folder.title + '</div>' +
                adminActions +
                previewEditor +
            '</div>' +
        '</li>';
    },

   // В gallery.js замените функцию getFolderBackgroundStyle

getFolderBackgroundStyle: function(folder) {
    // Если есть cover_url (это file_id), нужно получить URL
    // Пока используем заглушку, URL получим отдельно
    var imageUrl = 'https://static.tildacdn.ink/tild3730-6566-4766-b165-306164333335/photo-1499002238440-.jpg';
    
    // Если у папки есть обложка, попробуем использовать кэш или получить URL
    if (folder.cover_url && folder.cover_url.startsWith('http')) {
        // Это уже URL (старая система)
        imageUrl = folder.cover_url;
    } else if (folder.cover_url) {
        // Это file_id, нужно получить URL
        // Пока показываем заглушку, в фоне получим URL
        this.loadCoverUrl(folder.id, folder.cover_url);
    }
    
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

// Добавьте новую функцию для загрузки URL обложки
loadCoverUrl: function(folderId, fileId) {
    var self = this;
    // Запрашиваем URL у бэкенда
    fetch(API_BASE + '/photos/urls', {
        method: 'POST',
        headers: api.getHeaders(api.isAdmin()),
        body: JSON.stringify({ 
            folder_id: 'covers', // специальный маркер
            photos: [{ id: 'cover', file_id: fileId }]
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.urls && data.urls.cover) {
            // Обновляем обложку в DOM
            var imgEl = document.getElementById('folder-image-' + folderId);
            if (imgEl) {
                imgEl.style.backgroundImage = 'url(\'' + data.urls.cover + '\')';
            }
        }
    })
    .catch(function(e) {
        console.error('Ошибка загрузки обложки:', e);
    });
},

    // Редактирование превью папки
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

    // Открываем папку (показываем фото)
    openFolder: function(folder, updateHash) {
        this.lastOpenedFolderId = folder.id;
        
        if (updateHash !== false) {
            window.location.hash = 'folder=' + folder.id;
        }
        this.currentFolder = folder;
        this.currentPhotos = [];
        this.visiblePhotos = [];
        
        // Прячем главную страницу, показываем страницу папки
        var coverSection = document.getElementById('rec-cover');
        var mainPage = document.getElementById('main-page');
        var mainFooter = document.getElementById('main-footer');
        var folderPage = document.getElementById('folder-page');
        var sidebarButtons = document.getElementById('sidebar-admin-buttons');
        var titleText = document.getElementById('folder-title-text');
        
        if (coverSection) coverSection.style.display = 'none';
        if (mainPage) mainPage.style.display = 'none';
        if (mainFooter) mainFooter.style.display = 'none';
        if (folderPage) folderPage.style.display = 'block';
        
        if (titleText) titleText.textContent = folder.title;
        
        if (sidebarButtons) {
            sidebarButtons.style.display = api.isAdmin() ? 'flex' : 'none';
        }
        
        this.loadPhotos(folder.id);
        window.scrollTo(0, 0);
    },

    // Возвращаемся на главную страницу
    showMainPage: function() {
        this.editingFolder = null;
        
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
        
        window.location.hash = '';
        
        var coverSection = document.getElementById('rec-cover');
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
        
        this.loadFolders();
    },

    // Загружаем фото в папке (двухэтапно: сначала список, потом ссылки)
    loadPhotos: function(folderId) {
        var self = this;
        var container = document.getElementById('photos-container');
        if (container) container.innerHTML = '<p>Загрузка...</p>';
        
        // Этап 1: Получаем список фото (ID и file_id)
        api.getPhotosList(folderId).then(function(photos) {
            if (!photos || photos.length === 0) {
                if (container) container.innerHTML = '<p>В этой папке пока нет фото</p>';
                return;
            }
            
            self.currentPhotos = photos;
            
            // Этап 2: Получаем ссылки от Telegram
            return api.getPhotosUrls(folderId, photos);
        }).then(function(urls) {
            if (!urls) return;
            
            // Добавляем URL к фото
            for (var i = 0; i < self.currentPhotos.length; i++) {
                var photo = self.currentPhotos[i];
                if (urls[photo.id]) {
                    photo.url = urls[photo.id];
                }
            }
            
            self.visiblePhotos = self.currentPhotos;
            self.renderPhotos();
        }).catch(function(error) {
            console.error('Ошибка загрузки фото:', error);
            if (container) container.innerHTML = '<p>Ошибка загрузки</p>';
        });
    },

    // Показываем фото на странице
    renderPhotos: function() {
        var self = this;
        var grid = document.getElementById('photos-container');
        if (!grid) return;
        
        if (self.visiblePhotos.length === 0) {
            grid.innerHTML = '<div class="empty-state"><h4>В этой папке пока нет фото</h4></div>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < self.visiblePhotos.length; i++) {
            html += self.createPhotoItem(self.visiblePhotos[i], i);
        }
        grid.innerHTML = html;
    },

    // Создаём HTML для одного фото
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
        
        // Если URL нет (фото удалено в Telegram), показываем заглушку
        var imgSrc = photo.url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ccc"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3EНет фото%3C/text%3E%3C/svg%3E';
        
        return '<div class="photo-item ' + hiddenClass + '" onclick="gallery.openFullscreen(' + index + ')">' +
            '<img src="' + imgSrc + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">' +
            adminActions +
        '</div>';
    },

    // Открываем фото на весь экран
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
        
        if (img) img.src = photo.url || '';
        if (link) link.href = photo.url || '#';
        if (viewer) viewer.style.display = 'flex';
        
        // Клавиатурная навигация
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
        
        // Свайпы для мобильных
        this.initSwipe();
    },

    initSwipe: function() {
        var self = this;
        var viewerEl = document.getElementById('fullscreen-viewer');
        if (!viewerEl) return;
        
        var imageContainer = viewerEl.querySelector('.fullscreen-viewer__image-container');
        if (!imageContainer) return;
        
        var touchStartX = 0;
        var touchEndX = 0;
        
        imageContainer.ontouchstart = function(e) {
            touchStartX = e.changedTouches[0].screenX;
        };
        
        imageContainer.ontouchend = function(e) {
            touchEndX = e.changedTouches[0].screenX;
            var diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) self.nextPhoto();
                else self.prevPhoto();
            }
        };
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
    
    allFoldersLoaded: function() {
        return true; // Теперь всегда true, нет пагинации папок
    }
};

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    gallery.init();
});

// Прокрутка к папкам
function scrollToFolders() {
    var mainPage = document.getElementById('main-page');
    if (mainPage) {
        mainPage.scrollIntoView({ behavior: 'smooth' });
    }
}
