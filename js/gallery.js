var gallery = {
    folders: [],
    currentPhotos: [],
    currentFolder: null,
    currentPhotoIndex: 0,

    init: function() {
        var self = this;
        // Проверяем hash при загрузке
        var hash = window.location.hash;
        if (hash && hash.indexOf('folder=') !== -1) {
            var folderId = hash.split('folder=')[1];
            // Загружаем папки и открываем нужную
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
            
            // Инициализируем drag & drop если админ
            if (isAdmin && typeof admin !== 'undefined') {
                admin.initSortable();
            }
            
            for (var j = 0; j < visibleFolders.length; j++) {
                (function(folder) {
                    var card = document.getElementById('folder-' + folder.id);
                    if (card) {
                        card.onclick = function(e) {
                            if (e.target.closest('.folder-card__admin-actions')) return;
                            self.openFolder(folder);
                        };
                    }
                })(visibleFolders[j]);
            }
        });
    },

    createFolderCard: function(folder) {
        var isAdmin = api.isAdmin();
        var hiddenClass = folder.hidden ? 'hidden-folder' : '';
        var coverImage = folder.cover_url || 'https://static.tildacdn.ink/tild3730-6566-4766-b165-306164333335/photo-1499002238440-.jpg';
        
        var adminActions = '';
        if (isAdmin) {
            adminActions = '<div class="folder-card__admin-actions">' +
                '<button onclick="event.stopPropagation(); admin.toggleFolderHidden(\'' + folder.id + '\', ' + !folder.hidden + ')" title="' + (folder.hidden ? 'Показать' : 'Скрыть') + '">' + (folder.hidden ? '👁' : '🙈') + '</button>' +
                '<button onclick="event.stopPropagation(); admin.renameFolder(\'' + folder.id + '\', \'' + folder.title + '\')" title="Переименовать">✏️</button>' +
                '<button onclick="event.stopPropagation(); admin.deleteFolder(\'' + folder.id + '\')" title="Удалить">🗑️</button>' +
            '</div>';
        }
        
        return '<li id="folder-' + folder.id + '" class="t214__col t-item t-card__col t-col t-col_4 folder-card ' + hiddenClass + '" data-id="' + folder.id + '">' +
            '<div class="folder-card__image" style="background-image: url(\'' + coverImage + '\');">' +
                '<div class="folder-card__title">' + folder.title + '</div>' +
                adminActions +
            '</div>' +
        '</li>';
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
        
        // Устанавливаем фото в верхнюю полоску (превью папки или дефолтное)
        if (coverImage) {
            var imageUrl = folder.cover_url || 'https://static.tildacdn.ink/tild3730-6566-4766-b165-306164333335/photo-1499002238440-.jpg';
            coverImage.style.backgroundImage = "url('" + imageUrl + "')";
        }
        
        // Устанавливаем название папки под полоской
        if (titleText) titleText.textContent = folder.title;
        
        // Показываем админ-кнопки в сайдбаре если админ
        if (sidebarButtons) {
            sidebarButtons.style.display = api.isAdmin() ? 'flex' : 'none';
        }
        
        this.loadPhotos(folder.id);
        window.scrollTo(0, 0);
    },

    showMainPage: function() {
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
            
            var isAdmin = api.isAdmin();
            var visiblePhotos = [];
            for (var i = 0; i < photos.length; i++) {
                if (isAdmin || !photos[i].hidden) {
                    visiblePhotos.push(photos[i]);
                }
            }
            
            if (visiblePhotos.length === 0) {
                if (grid) grid.innerHTML = '<div class="empty-state"><h4>В этой папке пока нет фото</h4></div>';
                return;
            }
            
            if (grid) {
                grid.innerHTML = visiblePhotos.map(function(photo, index) {
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
        var isAdmin = api.isAdmin();
        var visiblePhotos = [];
        for (var i = 0; i < this.currentPhotos.length; i++) {
            if (isAdmin || !this.currentPhotos[i].hidden) {
                visiblePhotos.push(this.currentPhotos[i]);
            }
        }
        this.currentPhotos = visiblePhotos;
        
        if (index < 0 || index >= this.currentPhotos.length) return;
        
        this.currentPhotoIndex = index;
        var photo = this.currentPhotos[index];
        
        var img = document.getElementById('fullscreen-image');
        var link = document.getElementById('download-link');
        var viewer = document.getElementById('fullscreen-viewer');
        
        // Показываем/скрываем кнопки админа
        var btnCover = document.getElementById('btn-set-cover');
        var btnDelete = document.getElementById('btn-delete-photo');
        
        if (btnCover) btnCover.style.display = isAdmin ? 'inline-block' : 'none';
        if (btnDelete) btnDelete.style.display = isAdmin ? 'inline-block' : 'none';
        
        if (img) img.src = photo.url;
        if (link) link.href = photo.url;
        if (viewer) viewer.style.display = 'flex';
        
        var self = this;
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
        }
    },

    prevPhoto: function() {
        if (this.currentPhotoIndex > 0) {
            this.openFullscreen(this.currentPhotoIndex - 1);
        }
    },

    nextPhoto: function() {
        if (this.currentPhotoIndex < this.currentPhotos.length - 1) {
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
