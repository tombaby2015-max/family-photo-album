// admin.js — админ-панель (исправленная версия выбора фото)
// ... (все методы до enterSelectionMode остаются без изменений) ...

    // === МАССОВОЕ УДАЛЕНИЕ ===
    enterSelectionMode: function() {
        this.isSelectionMode = true;
        this.isAllSelected = false;
        this.excludedPhotos = [];
        this.selectedPhotos = [];
       
        // Скрываем кнопку "Выбрать фото", показываем панель действий
        var selectBtn = document.querySelector('#sidebar-admin-buttons > .admin-btn');
        var toolbar = document.getElementById('selection-toolbar');
       
        if (selectBtn) selectBtn.style.display = 'none';
        if (toolbar) {
            toolbar.style.display = 'flex';
            // Сбрасываем текст кнопки "Выбрать все"
            var selectAllBtn = document.getElementById('btn-select-all');
            if (selectAllBtn) selectAllBtn.textContent = 'Выбрать все';
        }
       
        // Добавляем чекбоксы к фото
        this.addCheckboxesToPhotos();
        this.updateSelectionCount();
    },
   
    exitSelectionMode: function() {
        this.isSelectionMode = false;
        this.isAllSelected = false;
        this.excludedPhotos = [];
        this.selectedPhotos = [];
       
        // Показываем кнопку "Выбрать фото", скрываем панель действий
        var selectBtn = document.querySelector('#sidebar-admin-buttons > .admin-btn');
        var toolbar = document.getElementById('selection-toolbar');
       
        if (selectBtn) selectBtn.style.display = 'block';
        if (toolbar) toolbar.style.display = 'none';
       
        // Убираем чекбоксы
        this.removeCheckboxesFromPhotos();
    },
   
    addCheckboxesToPhotos: function() {
        var photos = document.querySelectorAll('.photo-item');
        var self = this;
       
        for (var i = 0; i < photos.length; i++) {
            var photo = photos[i];
            // Удаляем старый чекбокс если есть (на всякий случай)
            var oldCheckbox = photo.querySelector('.photo-checkbox-custom');
            if (oldCheckbox) {
                oldCheckbox.remove();
            }
            
            var photoId = photo.getAttribute('data-id');
            if (!photoId) continue;
           
            // Создаём чекбокс
            var checkbox = document.createElement('div');
            checkbox.className = 'photo-checkbox-custom';
            checkbox.setAttribute('data-photo-id', photoId);
           
            // Обработчик клика
            checkbox.onclick = function(e) {
                e.stopPropagation();
                var id = this.getAttribute('data-photo-id');
                self.togglePhotoSelection(id, this);
            };
           
            photo.appendChild(checkbox);
        }
        
        // Применяем текущее состояние выделения
        this.applySelectionState();
    },
    
    // Новый метод: применяет текущее состояние к чекбоксам
    applySelectionState: function() {
        var checkboxes = document.querySelectorAll('.photo-checkbox-custom');
        var self = this;
        
        for (var i = 0; i < checkboxes.length; i++) {
            var checkbox = checkboxes[i];
            var photoId = checkbox.getAttribute('data-photo-id');
            var isSelected = this.isPhotoSelected(photoId);
            
            if (isSelected) {
                checkbox.classList.add('checked');
                checkbox.innerHTML = '✓';
            } else {
                checkbox.classList.remove('checked');
                checkbox.innerHTML = '';
            }
        }
    },
    
    // Новый метод: проверяет, выбрано ли фото
    isPhotoSelected: function(photoId) {
        if (this.isAllSelected) {
            return this.excludedPhotos.indexOf(photoId) === -1;
        } else {
            return this.selectedPhotos.indexOf(photoId) > -1;
        }
    },
   
    removeCheckboxesFromPhotos: function() {
        var checkboxes = document.querySelectorAll('.photo-checkbox-custom');
        for (var i = 0; i < checkboxes.length; i++) {
            checkboxes[i].remove();
        }
    },
   
    toggleSelectAll: function() {
        this.isAllSelected = !this.isAllSelected;
        
        if (this.isAllSelected) {
            // Режим "все выбраны" — очищаем списки
            this.excludedPhotos = [];
            this.selectedPhotos = [];
        } else {
            // Режим "ничего не выбрано"
            this.excludedPhotos = [];
            this.selectedPhotos = [];
        }
        
        // Применяем визуально
        this.applySelectionState();
        this.updateSelectionCount();
    },
   
    togglePhotoSelection: function(photoId, checkboxEl) {
        // Определяем текущее состояние
        var currentlySelected = this.isPhotoSelected(photoId);
        
        if (this.isAllSelected) {
            // Режим "все выбраны" — работаем с excludedPhotos
            var index = this.excludedPhotos.indexOf(photoId);
            
            if (currentlySelected) {
                // Было выбрано → исключаем
                this.excludedPhotos.push(photoId);
            } else {
                // Было исключено → убираем из исключений
                if (index > -1) {
                    this.excludedPhotos.splice(index, 1);
                }
            }
        } else {
            // Обычный режим — работаем с selectedPhotos
            var index = this.selectedPhotos.indexOf(photoId);
            
            if (currentlySelected) {
                // Было выбрано → убираем
                if (index > -1) {
                    this.selectedPhotos.splice(index, 1);
                }
            } else {
                // Не было выбрано → добавляем
                this.selectedPhotos.push(photoId);
            }
        }
        
        // Обновляем визуальное состояние этого чекбокса
        var newState = !currentlySelected;
        if (newState) {
            checkboxEl.classList.add('checked');
            checkboxEl.innerHTML = '✓';
        } else {
            checkboxEl.classList.remove('checked');
            checkboxEl.innerHTML = '';
        }
        
        // Проверяем, не надо ли переключить режим
        this.adjustSelectionMode();
        this.updateSelectionCount();
    },

    adjustSelectionMode: function() {
        var total = gallery.currentPhotos.length;
        var selectedCount = this.getSelectedCount();
        
        var btn = document.getElementById('btn-select-all');
        
        if (selectedCount === 0) {
            // Ничего не выбрано
            this.isAllSelected = false;
            this.excludedPhotos = [];
            this.selectedPhotos = [];
            if (btn) btn.textContent = 'Выбрать все';
        } else if (selectedCount === total) {
            // Всё выбрано — переключаемся в режим "все выбраны"
            this.isAllSelected = true;
            this.excludedPhotos = [];
            this.selectedPhotos = [];
            if (btn) btn.textContent = 'Снять все выделения';
        } else {
            // Частичный выбор — остаёмся в текущем режиме
            if (this.isAllSelected) {
                // Были в режиме "все выбраны", но что-то исключили
                // Остаёмся в этом режиме, excludedPhotos уже актуальны
                if (btn) btn.textContent = 'Выбрать все';
            } else {
                // Обычный режим выбора
                if (btn) btn.textContent = 'Выбрать все';
            }
        }
    },
    
    // Новый вспомогательный метод
    getSelectedCount: function() {
        var total = gallery.currentPhotos.length;
        if (this.isAllSelected) {
            return total - this.excludedPhotos.length;
        } else {
            return this.selectedPhotos.length;
        }
    },
   
    updateSelectionCount: function() {
        var btn = document.getElementById('btn-delete-selected');
        var count = this.getSelectedCount();
        
        if (btn) {
            btn.textContent = 'Удалить выбранные (' + count + ')';
            btn.disabled = count === 0;
            btn.style.opacity = count === 0 ? '0.5' : '1';
        }
        
        // Update select all button text based on current state
        var selectAllBtn = document.getElementById('btn-select-all');
        if (selectAllBtn) {
            selectAllBtn.textContent = this.isAllSelected ? 'Снять все выделения' : 'Выбрать все';
        }
    },
   
    deleteSelectedPhotos: function() {
        var folderId = gallery.currentFolder ? gallery.currentFolder.id : null;
        if (!folderId) return;
       
        var allPhotos = gallery.currentPhotos;
        var ids = [];
        
        if (this.isAllSelected) {
            // Выбираем все, кроме исключённых
            for (var i = 0; i < allPhotos.length; i++) {
                var photoId = allPhotos[i].id;
                if (this.excludedPhotos.indexOf(photoId) === -1) {
                    ids.push(photoId);
                }
            }
        } else {
            ids = this.selectedPhotos.slice();
        }
        
        if (!ids.length) return;
        if (!confirm('Удалить ' + ids.length + ' фото?')) return;
        
        var self = this;
        var deleted = 0;
        
        function next() {
            if (!ids.length) {
                self.exitSelectionMode();
                gallery.loadPhotos(folderId);
                alert('Удалено: ' + deleted);
                return;
            }
            api.deletePhoto(folderId, ids.shift()).then(function() {
                deleted++;
                next();
            }).catch(next);
        }
        
        next();
    },

// ... (остальные методы без изменений) ...
