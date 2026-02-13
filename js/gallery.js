const gallery = {
    folders: [],
    currentPhotos: [],
    currentFolder: null,
    currentPhotoIndex: 0,

    async init() {
        await this.loadFolders();
    },

    async loadFolders() {
        const container = document.getElementById('folders-container');
        container.innerHTML = '<li class="loading">Загрузка папок...</li>';
        
        this.folders = await api.getFolders();
        
        const isAdmin = api.isAdmin();
        const visibleFolders = isAdmin ? this.folders : this.folders.filter(f => !f.hidden);
        
        if (visibleFolders.length === 0) {
            container.innerHTML = '<li class="empty-state"><h4>Папок пока нет</h4></li>';
            return;
        }
        
        visibleFolders.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        container.innerHTML = visibleFolders.map(folder => this.createFolderCard(folder)).join('');
        
        visibleFolders.forEach(folder => {
            const card = document.getElementById(`folder-${folder.id}`);
            if (card) {
                card.onclick = (e) => {
                    if (e.target.closest('.folder-card__admin-actions')) return;
                    this.openFolder(folder);
                };
            }
        });
    },

    createFolderCard(folder) {
        const isAdmin = api.isAdmin();
        const hiddenClass = folder.hidden ? 'hidden-folder' : '';
        const coverImage = folder.cover_url || 'https://static.tildacdn.ink/tild3730-6566-4766-b165-306164333335/photo-1499002238440-.jpg';
        
        let adminActions = '';
        if (isAdmin) {
            adminActions = `
                <div class="folder-card__admin-actions">
                    <button onclick="admin.toggleFolderHidden('${folder.id}', ${!folder.hidden})" title="${folder.hidden ? 'Показать' : 'Скрыть'}">
                        ${folder.hidden ? '👁' : '🙈'}
                    </button>
                    <button onclick="admin.renameFolder('${folder.id}', '${folder.title}')" title="Переименовать">✏️</button>
                    <button onclick="admin.deleteFolder('${folder.id}')" title="Удалить">🗑️</button>
                </div>
            `;
        }
        
        return `
            <li id="folder-${folder.id}" class="t214__col t-item t-card__col t-col t-col_4 folder-card ${hiddenClass}">
                <div class="folder-card__image" style="background-image: url('${coverImage}');">
                    <div class="folder-card__title">${folder.title}</div>
                    ${adminActions}
                </div>
            </li>
        `;
    },

    async openFolder(folder) {
        this.currentFolder = folder;
        
        document.getElementById('cover-section').style.display = 'none';
        document.getElementById('main-page').style.display = 'none';
        document.getElementById('main-footer').style.display = 'none';
        document.getElementById('folder-page').style.display = 'block';
        
        if (api.isAdmin()) {
            document.getElementById('folder-admin-panel').style.display = 'block';
        }
        
        await this.loadPhotos(folder.id);
        window.scrollTo(0, 0);
    },

    showMainPage() {
        document.getElementById('folder-page').style.display = 'none';
        document.getElementById('cover-section').style.display = 'block';
        document.getElementById('main-page').style.display = 'block';
        document.getElementById('main-footer').style.display = 'block';
        this.currentFolder = null;
        this.currentPhotos = [];
        window.scrollTo(0, document.getElementById('cover-section').offsetHeight);
        this.loadFolders();
    },

    async loadPhotos(folderId) {
        const grid = document.getElementById('photos-grid');
        grid.innerHTML = '<div class="loading">Загрузка фото...</div>';
        
        this.currentPhotos = await api.getPhotos(folderId);
        
        const isAdmin = api.isAdmin();
        const visiblePhotos = isAdmin ? this.currentPhotos : this.currentPhotos.filter(p => !p.hidden);
        
        if (visiblePhotos.length === 0) {
            grid.innerHTML = '<div class="empty-state"><h4>В этой папке пока нет фото</h4></div>';
            return;
        }
        
        grid.innerHTML = visiblePhotos.map((photo, index) => this.createPhotoItem(photo, index)).join('');
    },

    createPhotoItem(photo, index) {
        const isAdmin = api.isAdmin();
        const hiddenClass = photo.hidden ? 'hidden-photo' : '';
        
        let adminActions = '';
        if (isAdmin) {
            adminActions = `
                <div class="photo-item__admin-actions">
                    <button onclick="admin.togglePhotoHidden('${photo.id}', ${!photo.hidden})" title="${photo.hidden ? 'Показать' : 'Скрыть'}">
                        ${photo.hidden ? '👁' : '🙈'}
                    </button>
                    <button onclick="admin.deletePhoto('${photo.id}')" title="Удалить">🗑️</button>
                </div>
            `;
        }
        
        return `
            <div class="photo-item ${hiddenClass}" onclick="gallery.openFullscreen(${index})">
                <img src="${photo.url}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">
                ${adminActions}
            </div>
        `;
    },

    openFullscreen(index) {
        const isAdmin = api.isAdmin();
        this.currentPhotos = isAdmin ? this.currentPhotos : this.currentPhotos.filter(p => !p.hidden);
        
        if (index < 0 || index >= this.currentPhotos.length) return;
        
        this.currentPhotoIndex = index;
        const photo = this.currentPhotos[index];
        
        document.getElementById('fullscreen-image').src = photo.url;
        document.getElementById('download-link').href = photo.url;
        document.getElementById('fullscreen-viewer').style.display = 'flex';
        
        document.addEventListener('keydown', this.handleKeydown);
    },

    closeFullscreen() {
        document.getElementById('fullscreen-viewer').style.display = 'none';
        document.removeEventListener('keydown', this.handleKeydown);
    },

    prevPhoto() {
        if (this.currentPhotoIndex > 0) {
            this.openFullscreen(this.currentPhotoIndex - 1);
        }
    },

    nextPhoto() {
        if (this.currentPhotoIndex < this.currentPhotos.length - 1) {
            this.openFullscreen(this.currentPhotoIndex + 1);
        }
    },

    handleKeydown(e) {
        if (e.key === 'Escape') {
            gallery.closeFullscreen();
        } else if (e.key === 'ArrowLeft') {
            gallery.prevPhoto();
        } else if (e.key === 'ArrowRight') {
            gallery.nextPhoto();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    gallery.init();
});

function scrollToFolders() {
    document.getElementById('main-page').scrollIntoView({ behavior: 'smooth' });
}
