document.addEventListener('DOMContentLoaded', () => {

    class GestionEleves {
        constructor() {
            this.eleves = [];
            this.colonnes = ['A placer'];
            this.currentEleveId = null;
        this.sortOrderClasse = 1;

            // Cache DOM elements
            this.colonnesContainer = document.getElementById('colonnes-container');
            this.settingsModal = document.getElementById('settings-modal');
            this.eleveModal = document.getElementById('modal');
            this.eleveForm = document.getElementById('eleve-form');
            this.modalTitle = document.getElementById('modal-title');
            this.deleteButton = document.getElementById('delete-button');
            this.csvFileInput = document.getElementById('csv-file');
            this.toggleAverageCheckbox = document.getElementById('toggle-average');
            this.toggleLv1Checkbox = document.getElementById('toggle-lv1');
            this.toggleLv2Checkbox = document.getElementById('toggle-lv2');
            this.toggleOption1Checkbox = document.getElementById('toggle-option1');
            this.toggleOption2Checkbox = document.getElementById('toggle-option2');
            this.toggleOption3Checkbox = document.getElementById('toggle-option3');
            this.toggleIcon = document.getElementById('toggle-icon');

            // Initial setup
            this.initializeEventListeners();
            this.setupLocalStorage(); // Charge les données et applique les états des cases à cocher
            this.ensureDefaultColumn();
            // Ne pas appeler updateToggleStates() ici pour éviter d'écraser les états chargés
            this.afficherEleves(); // Calls relationship icon updates internally
        }

        // --- Initialization ---

        initializeEventListeners() {
            document.getElementById('add-button').addEventListener('click', () => this.ouvrirModal('ajouter'));
            document.getElementById('add-column-button').addEventListener('click', () => this.ajouterColonne());
            document.getElementById('settings-button').addEventListener('click', () => this.settingsModal.classList.remove('hidden'));
            document.getElementById('export-button').addEventListener('click', () => this.exporterDonneesCSV());
            document.getElementById('import-csv-button').addEventListener('click', () => this.csvFileInput.click());
            this.csvFileInput.addEventListener('change', (e) => this.importerCSV(e));
            document.querySelectorAll('.close').forEach(button => button.addEventListener('click', () => this.fermerModal()));
            this.eleveForm.addEventListener('submit', (e) => this.sauvegarderEleve(e));
            document.getElementById('download-template').addEventListener('click', (e) => {
                e.preventDefault();
                this.creerEtTelechargerModeleCSV();
            });
            document.getElementById('sort-alphabetique').addEventListener('click', () => this.trierAlphabetiquement());
            document.getElementById('sort-moyenne').addEventListener('click', () => this.trierParMoyenne());
            document.getElementById('sort-classe').addEventListener('click', () => {
                this.sortParClasse();
            });
            this.deleteButton.addEventListener('click', () => this.supprimerEleve());
            document.getElementById('clear-data-button').addEventListener('click', () => this.effacerDonneesLocales());

            this.toggleAverageCheckbox.addEventListener('change', () => {
                this.toggleVisibility('.moyenne-span', this.toggleAverageCheckbox.checked);
                this.updateToggleStates(); // Sauvegarder l'état dans localStorage
            });
            this.toggleLv1Checkbox.addEventListener('change', () => {
                this.toggleVisibility('.lv1-span', this.toggleLv1Checkbox.checked);
                this.updateToggleStates(); // Sauvegarder l'état dans localStorage
            });
            this.toggleLv2Checkbox.addEventListener('change', () => {
                this.toggleVisibility('.lv2-span', this.toggleLv2Checkbox.checked);
                this.updateToggleStates(); // Sauvegarder l'état dans localStorage
            });
            this.toggleOption1Checkbox.addEventListener('change', () => {
                this.toggleVisibility('.option1-span', this.toggleOption1Checkbox.checked);
                this.updateToggleStates(); // Sauvegarder l'état dans localStorage
            });
            this.toggleOption2Checkbox.addEventListener('change', () => {
                this.toggleVisibility('.option2-span', this.toggleOption2Checkbox.checked);
                this.updateToggleStates(); // Sauvegarder l'état dans localStorage
            });
            this.toggleOption3Checkbox.addEventListener('change', () => {
                this.toggleVisibility('.option3-span', this.toggleOption3Checkbox.checked);
                this.updateToggleStates(); // Sauvegarder l'état dans localStorage
            });

            document.getElementById('toggle-classe').addEventListener('change', (e) => {
                localStorage.setItem('classeVisible', e.target.checked);
                this.toggleVisibility('.classe-span', e.target.checked);
                this.updateToggleStates();
            });

            if (this.toggleIcon) {
                this.toggleIcon.addEventListener('click', () => this.toggleAplacerColumn());
            }

            // Add a single, delegated event listener for option sorting clicks.
            // This is more efficient than adding a listener every time the summary is updated.
            this.colonnesContainer.addEventListener('click', (event) => {
                const target = event.target.closest('.compteur-item');
                const summaryContainer = target ? target.closest('.choix-a-placer') : null;
                const columnElement = summaryContainer ? summaryContainer.closest('.colonne') : null;

                if (target && columnElement) {
                    const optionKey = target.dataset.optionKey;
                    const optionType = target.dataset.optionType;
                    const nomColonne = columnElement.dataset.nom;
                    
                    if (optionKey && optionType && nomColonne) {
                        this.trierParOption(optionKey, optionType, nomColonne);
                    }
                }
            });
        }

        setupLocalStorage() {
            try {
                // Charger les données des élèves et des colonnes
                localStorage.getItem('classeVisible') === null && localStorage.setItem('classeVisible', 'true');
                // Synchroniser la checkbox et la visibilité avec localStorage au démarrage
                const classeVisible = localStorage.getItem('classeVisible') === 'true';
                document.getElementById('toggle-classe').checked = classeVisible;
                this.toggleVisibility('.classe-span', classeVisible);
                const savedData = localStorage.getItem('gestionEleves');
                if (savedData) {
                    const data = JSON.parse(savedData);
                    if (data && Array.isArray(data.eleves) && Array.isArray(data.colonnes)) {
                        // Ensure options array exists and has 5 elements when loading
                        this.eleves = data.eleves.map(e => {
                            const options = e.options && Array.isArray(e.options) ? e.options : [];
                            // Pad options array to length 5 if necessary
                            while (options.length < 5) {
                                options.push('');
                            }
                            return { ...e, options: options.slice(0, 5) }; // Ensure exactly 5
                        });
                        this.colonnes = data.colonnes;
                        if (!this.colonnes.includes('A placer')) {
                             this.colonnes.unshift('A placer');
                        }
                    } else { this.resetData(); }
                } else { this.resetData(); }
                
                // Charger les états des cases à cocher
                const savedToggleStates = localStorage.getItem('toggleStates');
                if (savedToggleStates) {
                    try {
                        const toggleStates = JSON.parse(savedToggleStates);
                        // Appliquer les états sauvegardés aux cases à cocher
                        if (toggleStates.moyenne !== undefined) this.toggleAverageCheckbox.checked = toggleStates.moyenne;
                        if (toggleStates.lv1 !== undefined) this.toggleLv1Checkbox.checked = toggleStates.lv1;
                        if (toggleStates.lv2 !== undefined) this.toggleLv2Checkbox.checked = toggleStates.lv2;
                        if (toggleStates.option1 !== undefined) this.toggleOption1Checkbox.checked = toggleStates.option1;
                        if (toggleStates.option2 !== undefined) this.toggleOption2Checkbox.checked = toggleStates.option2;
                        if (toggleStates.option3 !== undefined) this.toggleOption3Checkbox.checked = toggleStates.option3;
                        
                        // Appliquer immédiatement les états de visibilité
                        this.toggleVisibility('.moyenne-span', this.toggleAverageCheckbox.checked);
                        this.toggleVisibility('.lv1-span', this.toggleLv1Checkbox.checked);
                        this.toggleVisibility('.lv2-span', this.toggleLv2Checkbox.checked);
                        this.toggleVisibility('.option1-span', this.toggleOption1Checkbox.checked);
                        this.toggleVisibility('.option2-span', this.toggleOption2Checkbox.checked);
                        this.toggleVisibility('.option3-span', this.toggleOption3Checkbox.checked);
                    } catch (e) {
                        console.error("Erreur lors du chargement des états des cases à cocher:", e);
                    }
                }
            } catch (error) {
                console.error("Error reading from local storage:", error);
                this.resetData();
            }
        }

        resetData() {
            this.eleves = [];
            this.colonnes = ['A placer'];
            console.log("Data reset to default.");
        }

        ensureDefaultColumn() {
            if (!document.querySelector(`.colonne[data-nom="A placer"]`)) {
                this.creerColonneDOM('A placer');
            }
            this.colonnes.forEach(nom => {
                 if (nom !== 'A placer' && !document.querySelector(`.colonne[data-nom="${nom}"]`)) {
                      this.creerColonneDOM(nom);
                 }
            });
        }

        updateToggleStates() {
            // Appliquer les états de visibilité
            this.toggleVisibility('.classe-span', localStorage.getItem('classeVisible') === 'true');
            this.toggleVisibility('.moyenne-span', this.toggleAverageCheckbox.checked);
            this.toggleVisibility('.lv1-span', this.toggleLv1Checkbox.checked);
            this.toggleVisibility('.lv2-span', this.toggleLv2Checkbox.checked);
            this.toggleVisibility('.option1-span', this.toggleOption1Checkbox.checked);
            this.toggleVisibility('.option2-span', this.toggleOption2Checkbox.checked);
            this.toggleVisibility('.option3-span', this.toggleOption3Checkbox.checked);
            
            // Sauvegarder les états dans le stockage local
            const toggleStates = {
                moyenne: this.toggleAverageCheckbox.checked,
                lv1: this.toggleLv1Checkbox.checked,
                lv2: this.toggleLv2Checkbox.checked,
                option1: this.toggleOption1Checkbox.checked,
                option2: this.toggleOption2Checkbox.checked,
                option3: this.toggleOption3Checkbox.checked
            };
            localStorage.setItem('toggleStates', JSON.stringify(toggleStates));
        }

        toggleVisibility(selector, isVisible) {
            document.querySelectorAll(selector).forEach(span => {
                span.style.display = isVisible ? 'inline' : 'none';
            });
        }

        toggleAplacerColumn() {
            const studentListColumn = document.querySelector('.colonne[data-nom="A placer"]');
             if (!studentListColumn) return;
             studentListColumn.classList.toggle('hidden');
             const isHidden = studentListColumn.classList.contains('hidden');
             this.toggleIcon.classList.toggle('fa-chevron-left', !isHidden);
             this.toggleIcon.classList.toggle('fa-chevron-right', isHidden);
             this.toggleIcon.title = isHidden ? "Afficher la colonne 'A placer'" : "Masquer la colonne 'A placer'";
        }

        // Get groups associated with a student
        getStudentGroups(studentId) {
            // Initialize empty array if student has no groups
            if (!this.eleves || !studentId) return [];
            
            // Find the student by ID
            const student = this.eleves.find(e => e.id === studentId);
            if (!student || !student.groups) return [];
            
            // Return the student's groups, ensuring each has required properties
            return student.groups.map(group => ({
                name: group.name || '',
                color: group.color || 'dark-blue'
            }));
        }

        // --- Core Data Operations ---

        sauvegarderDonnees() {
            try {
                localStorage.setItem('gestionEleves', JSON.stringify({
                    eleves: this.eleves,
                    colonnes: this.colonnes
                }));
                this.mettreAJourCompteur();
                this.updateStudentRelationshipIcons(); // Update relationship icons
            } catch (error) {
                console.error("Error saving data:", error);
                alert("Erreur sauvegarde données.");
            }
        }

        effacerDonneesLocales() {
             if (confirm('Voulez-vous vraiment effacer TOUTES les données locales ? Irréversible !')) {
                 localStorage.removeItem('gestionEleves');
                 localStorage.removeItem('studentGroups'); // Supprime les groupes
                 alert('Données locales effacées.');
                 this.resetData();
                 this.colonnesContainer.innerHTML = '';
                 this.ensureDefaultColumn();
                 this.afficherEleves();
                 studentGroups = []; // Réinitialise la variable des groupes
             }
        }

        // --- Student Management ---

        afficherEleves() {
            const showAverages = this.toggleAverageCheckbox.checked;
            const showLv1 = this.toggleLv1Checkbox.checked;
            const showLv2 = this.toggleLv2Checkbox.checked;
            // Ajouter la vérification de l'état de la checkbox classe
            const showClasse = document.getElementById('toggle-classe').checked;

            const studentsByColumn = {};
            this.colonnes.forEach(nom => {
                studentsByColumn[nom] = [];
                const liste = document.querySelector(`.eleves-liste[data-colonne="${nom}"]`);
                if (liste) liste.innerHTML = '';
                 else if (!document.querySelector(`.colonne[data-nom="${nom}"]`)) {
                     this.creerColonneDOM(nom);
                     studentsByColumn[nom] = [];
                 }
            });

            this.eleves.forEach(eleve => {
                const colName = eleve.colonne && this.colonnes.includes(eleve.colonne) ? eleve.colonne : 'A placer';
                 if (eleve.colonne !== colName) eleve.colonne = colName;
                 if (!studentsByColumn[colName]) {
                     studentsByColumn['A placer'].push(eleve);
                     eleve.colonne = 'A placer';
                 } else {
                     studentsByColumn[colName].push(eleve);
                 }
            });

            this.colonnes.forEach(nom => {
                const liste = document.querySelector(`.eleves-liste[data-colonne="${nom}"]`);
                if (!liste) return;
                const fragment = document.createDocumentFragment();
                studentsByColumn[nom].forEach(eleve => {
                    const li = document.createElement('li');
                    li.className = 'eleve-item';
                    li.dataset.id = eleve.id;

                    const strong = document.createElement('strong');
                    // Display name as NOM Prénom
                    strong.textContent = `${eleve.nom || ''} ${eleve.prenom || ''}`.trim();
                    strong.className = eleve.sexe === 'M' ? 'nom-bleu' : (eleve.sexe === 'F' ? 'nom-rose' : '');
                    li.appendChild(strong);

                    // Ajouter l'affichage de la classe avant la moyenne
                    const classeSpan = this.createClasseSpan(eleve.classe, showClasse);
                    if (classeSpan) li.appendChild(classeSpan);

                    const moyenneSpan = this.createMoyenneSpan(eleve.moyenne, showAverages);
                    if (moyenneSpan) li.appendChild(moyenneSpan);
                    const lv1Span = this.createLangSpan(eleve.lv1, 'lv1', showLv1);
                    if (lv1Span) li.appendChild(lv1Span);
                    const lv2Span = this.createLangSpan(eleve.lv2, 'lv2', showLv2);
                    if (lv2Span) li.appendChild(lv2Span);
                    
                    // Ajout des spans pour les options 1, 2 et 3
                    const showOption1 = this.toggleOption1Checkbox.checked;
                    const showOption2 = this.toggleOption2Checkbox.checked;
                    const showOption3 = this.toggleOption3Checkbox.checked;
                    
                    const option1Span = this.createOptionSpan(eleve.options[0], 'option1', showOption1);
                    if (option1Span) li.appendChild(option1Span);
                    const option2Span = this.createOptionSpan(eleve.options[1], 'option2', showOption2);
                    if (option2Span) li.appendChild(option2Span);
                    const option3Span = this.createOptionSpan(eleve.options[2], 'option3', showOption3);
                    if (option3Span) li.appendChild(option3Span);

                    // Intégration directe des indicateurs de groupe
                    const studentGroups = this.getStudentGroups(eleve.id);
                    if (studentGroups && studentGroups.length > 0) {
                        // Déplacer l'ajout des indicateurs avant l'application des classes
                        studentGroups.forEach(group => {
                            const indicator = document.createElement('span');
                            indicator.className = `group-indicator ${group.color || 'dark-blue'}`;
                            indicator.textContent = group.name;
                            indicator.title = `Groupe: ${group.name}`;
                            indicator.style.backgroundColor = `var(--${group.color || 'dark-blue'}-color)`;
                            li.appendChild(indicator);
                        });
                        
                        // Appliquer les classes après avoir ajouté tous les éléments
                        li.classList.add('grouped');
                        if (studentGroups[0] && studentGroups[0].color) {
                            li.classList.add(studentGroups[0].color);
                        }
                    }

                    li.ondblclick = () => this.ouvrirModal('modifier', eleve);
                    fragment.appendChild(li);
                });
                liste.appendChild(fragment);
            });

            this.updateStudentRelationshipIcons(); // Update icons after DOM is built
            this.mettreAJourCompteur();
        }

        createMoyenneSpan(moyenneValue, show) {
            const moyenne = parseFloat(moyenneValue);
            if (isNaN(moyenne)) return null;
            const moyenneSpan = document.createElement('span');
            moyenneSpan.classList.add('moyenne-span');
            moyenneSpan.style.display = show ? 'inline' : 'none';
            moyenneSpan.textContent = moyenneValue;
                 if (moyenne >= 0 && moyenne < 2) moyenneSpan.classList.add('moyenne-0-2');
            else if (moyenne < 4) moyenneSpan.classList.add('moyenne-2-4');
            else if (moyenne < 6) moyenneSpan.classList.add('moyenne-4-6');
            else if (moyenne < 8) moyenneSpan.classList.add('moyenne-6-8');
            else if (moyenne < 10) moyenneSpan.classList.add('moyenne-8-10');
            else if (moyenne < 12) moyenneSpan.classList.add('moyenne-10-12');
            else if (moyenne < 14) moyenneSpan.classList.add('moyenne-12-14');
            else if (moyenne < 16) moyenneSpan.classList.add('moyenne-14-16');
            else if (moyenne < 18) moyenneSpan.classList.add('moyenne-16-18');
            else if (moyenne <= 20) moyenneSpan.classList.add('moyenne-18-20');
            return moyenneSpan;
        }

        createLangSpan(lang, type, show) {
            if (!lang) return null;
            let abbreviation = '', colorClass = '';
            const upperLang = lang.toUpperCase();
                 if (upperLang.includes('ANGLAIS')) { abbreviation = 'ANG'; colorClass = 'lv-anglais'; }
            else if (upperLang.includes('ITALIEN')) { abbreviation = 'ITA'; colorClass = 'lv-italien'; }
            else if (upperLang.includes('ALLEMAND')) { abbreviation = 'ALL'; colorClass = 'lv-allemand'; }
            else if (upperLang.includes('ESPAGNOL')) { abbreviation = 'ESP'; colorClass = 'lv-espanol'; }
            else {
                // Pour les langues non standard, prendre les 3 premières lettres
                abbreviation = upperLang.substring(0, 3);
                // Utiliser la couleur de l'option1 pour LV1 et option2 pour LV2
                colorClass = type === 'lv1' ? 'option1-span' : 'option2-span';
            }
            const span = document.createElement('span');
            span.classList.add(type === 'lv1' ? 'lv1-span' : 'lv2-span', colorClass);
            span.textContent = abbreviation;
            span.style.display = show ? 'inline' : 'none';
            span.title = lang; // Afficher le nom complet de la langue au survol
            return span;
        }
        
        createOptionSpan(option, type, show) {
            if (!option) return null;
            const span = document.createElement('span');
            span.classList.add(`${type}-span`, 'option-span');
            span.textContent = option.substring(0, 3).toUpperCase(); // Prend les 3 premières lettres en majuscules
            span.style.display = show ? 'inline' : 'none';
            span.title = option; // Affiche l'option complète au survol
            return span;
        }
        
        createClasseSpan(classe, show) {
            if (!classe) return null;
            const classeSpan = document.createElement('span');
            classeSpan.classList.add('classe-span');
            classeSpan.style.display = show ? 'inline' : 'none';
            classeSpan.textContent = classe;
            return classeSpan;
        }

        // ## CORRECTED NAME PARSING HERE ##
        sauvegarderEleve(e) {
            e.preventDefault();

            const eleveFullName = document.getElementById('eleve').value.trim();
            const nameParts = eleveFullName.split(' ').filter(part => part);

            // --- CORRECTED PARSING ---
            // Assume LAST word is Prénom, rest is NOM (matches "NOM Prénom" input format)
            let nom = '';
            let prenom = '';
            if (nameParts.length === 1) {
                nom = nameParts[0]; // If only one word, assume it's the NOM
            } else if (nameParts.length > 1) {
                nom = nameParts.slice(0, -1).join(' '); // Everything EXCEPT the last word is NOM
                prenom = nameParts.slice(-1)[0];      // The LAST word is Prénom
            }
            // --- END CORRECTED PARSING ---

            const moyenneValue = document.getElementById('moyenne').value.replace(',', '.').trim();
            const moyenne = parseFloat(moyenneValue);
            const sexeInput = this.eleveForm.querySelector('input[name="sexe"]:checked');

            // --- Validation ---
            let isValid = true;
            let errorMsg = [];
            // Use the parsed 'nom' for validation
            if (!nom) { // Check if NOM was successfully parsed
                 isValid = false;
                 errorMsg.push("Le champ NOM Prénom est requis (format NOM Prénom).");
            }
            if (!sexeInput) { isValid = false; errorMsg.push("Sexe requis."); }
            if (isNaN(moyenne) || moyenne < 0 || moyenne > 20) { isValid = false; errorMsg.push("Moyenne invalide (0-20)."); }
            if (!isValid) { alert("Erreurs:\n- " + errorMsg.join("\n- ")); return; }
            // --- End Validation ---

            const eleveData = {
                id: this.currentEleveId || Date.now(),
                classe: document.getElementById('classe').value,
                nom: nom,       // Use correctly parsed NOM
                prenom: prenom, // Use correctly parsed Prénom
                sexe: sexeInput.value,
                moyenne: moyenneValue,
                lv1: document.getElementById('lv1').value.trim(),
                lv2: document.getElementById('lv2').value.trim(),
                options: [
                  document.getElementById('option1').value.trim(),
                  document.getElementById('option2').value.trim(),
                  document.getElementById('option3').value.trim(),
                  document.getElementById('compatible').value.trim(), // Compat name (raw string)
                  document.getElementById('incompatible').value.trim()  // Incompat name (raw string)
                ],
                colonne: 'A placer'
            };

            if (this.currentEleveId) {
                const index = this.eleves.findIndex(el => el.id === this.currentEleveId);
                if (index !== -1) {
                    eleveData.colonne = this.eleves[index].colonne; // Keep existing column
                    this.eleves[index] = eleveData; // Update data
                } else {
                    console.error("Error modifying: Student ID not found", this.currentEleveId);
                    alert("Erreur: Élève non trouvé pour modification.");
                    return;
                }
            } else {
                this.eleves.push(eleveData); // Add new student
            }

            this.sauvegarderDonnees(); // Save and trigger UI updates
            this.afficherEleves();     // Refresh the entire display
            this.updateStudentRelationshipIcons(); // Explicitement mettre à jour les icônes de compatibilité
            this.fermerModal();        // Close the modal
        }
        // ## END OF CORRECTED sauvegardeEleve ##

        supprimerEleve() {
            if (this.currentEleveId && confirm(`Supprimer cet élève (${this.eleves.find(e => e.id === this.currentEleveId)?.nom || ''}) ?`)) {
                this.eleves = this.eleves.filter(eleve => eleve.id !== this.currentEleveId);
                this.sauvegarderDonnees();
                this.afficherEleves();
                this.fermerModal();
            }
        }

        trierAlphabetiquement() {
            // Préserver les informations de groupe avant le tri
            const groupInfo = this.eleves.map(e => ({
                id: e.id,
                groups: e.groups ? JSON.parse(JSON.stringify(e.groups)) : []
            }));

            this.eleves.sort((a, b) => {
                // Sort by NOM, then Prénom
                const nomCompare = (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' });
                return nomCompare !== 0 ? nomCompare : (a.prenom || '').localeCompare(b.prenom || '', 'fr', { sensitivity: 'base' });
            });

            // Restaurer les informations de groupe après le tri
            this.eleves.forEach(eleve => {
                const savedInfo = groupInfo.find(info => info.id === eleve.id);
                if (savedInfo) {
                    eleve.groups = savedInfo.groups;
                }
            });

            this.sauvegarderDonnees();
            this.rafraichirToutesLesColonnes();
            this.updateToggleStates(); // <-- Ajouté pour réappliquer la visibilité après tri alpha
            // Appeler updateStudentCards pour mettre à jour les indicateurs de groupe
            updateStudentCards();
            this.triggerSortAnimation();
        }



        trierParMoyenne() {
            // Préserver les informations de groupe avant le tri
            const groupInfo = this.eleves.map(e => ({
                id: e.id,
                groups: e.groups ? JSON.parse(JSON.stringify(e.groups)) : []
            }));

            this.eleves.sort((a, b) => {
                const moyenneA = parseFloat(a.moyenne), moyenneB = parseFloat(b.moyenne);
                // Handle NaN and sort descending
                if (isNaN(moyenneA) && isNaN(moyenneB)) return 0;
                if (isNaN(moyenneA)) return 1;
                if (isNaN(moyenneB)) return -1;
                return moyenneB - moyenneA;
            });

            // Restaurer les informations de groupe après le tri
            this.eleves.forEach(eleve => {
                const savedInfo = groupInfo.find(info => info.id === eleve.id);
                if (savedInfo) {
                    eleve.groups = savedInfo.groups;
                }
            });

            this.sauvegarderDonnees();
            this.rafraichirToutesLesColonnes();
            this.updateToggleStates(); // <-- Ajouté pour réappliquer la visibilité après tri moyenne
            // Appeler updateStudentCards pour mettre à jour les indicateurs de groupe
            updateStudentCards();
            this.triggerSortAnimation();
        }

        triggerSortAnimation() {
             document.querySelectorAll('.colonne').forEach(col => {
                 col.classList.add('tri-animation');
                 setTimeout(() => {
                     col.classList.remove('tri-animation');
                     updateStudentCards();
                 }, 500);
             });
        }

        sortParClasse() {
            // Préserver les informations de groupe avant le tri
            const groupInfo = this.eleves.map(e => ({
                id: e.id,
                groups: e.groups ? JSON.parse(JSON.stringify(e.groups)) : []
            }));

            this.eleves.sort((a, b) => {
                const classeCompare = a.classe.localeCompare(b.classe);
                return classeCompare === 0 ? a.nom.localeCompare(b.nom) : classeCompare * this.sortOrderClasse;
            });

            // Restaurer les informations de groupe après le tri
            this.eleves.forEach(eleve => {
                const savedInfo = groupInfo.find(info => info.id === eleve.id);
                if (savedInfo) {
                    eleve.groups = savedInfo.groups;
                }
            });

            this.sortOrderClasse *= -1;
            this.sauvegarderDonnees();
            this.rafraichirToutesLesColonnes();
            this.updateToggleStates();
            
            // Déplacer l'appel à triggerSortAnimation() avant updateStudentCards()
            this.triggerSortAnimation();
            
            // Ajouter un délai pour s'assurer que l'animation est terminée
            setTimeout(() => {
                updateStudentCards();
            }, 600); // 600ms correspond à la durée de l'animation (500ms) + une marge
        }

        // --- Column Management ---

        ajouterColonne() {
            const nomColonne = prompt("Nom nouvelle classe:");
            if (nomColonne?.trim()) {
                const cleanName = nomColonne.trim();
                if (!this.colonnes.includes(cleanName)) {
                    this.colonnes.push(cleanName); this.creerColonneDOM(cleanName); this.sauvegarderDonnees();
                } else { alert(`Colonne "${cleanName}" existe déjà.`); }
            }
        }

        creerColonneDOM(nom) {
             if (document.querySelector(`.colonne[data-nom="${nom}"]`)) return;
             const colonne = document.createElement('div'); colonne.className = 'colonne'; colonne.dataset.nom = nom;
             const header = document.createElement('div'); header.className = 'colonne-header';
             const titre = document.createElement('h2'); titre.textContent = nom;
             if (nom !== 'A placer') {
                 titre.contentEditable = "true";
                 titre.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); titre.blur(); } });
                 titre.addEventListener('blur', () => this.renommerColonne(nom, titre.textContent.trim()));
             } header.appendChild(titre);
             const compteur = document.createElement('span'); compteur.className = 'compteur'; compteur.dataset.colonne = nom;
             compteur.innerHTML = ' <strong> 0 <i class="fa fa-female icon-female"></i> 0 <i class="fa fa-male icon-male"></i> = 0 </strong> ';
             header.appendChild(compteur);
             
             const moyenneDiv = document.createElement('div'); moyenneDiv.className = 'moyenne-generale';
             moyenneDiv.textContent = 'Moy.= 0.00';
             header.appendChild(moyenneDiv);

             if (nom !== 'A placer') {
                 const btnSuppr = document.createElement('button'); btnSuppr.type = 'button'; btnSuppr.className = 'btn-supprimer-colonne';
                 btnSuppr.innerHTML = '×'; btnSuppr.title = `Supprimer ${nom}`;
                 btnSuppr.addEventListener('click', () => this.supprimerColonne(nom)); header.appendChild(btnSuppr);
             }
             colonne.appendChild(header);

             // Add the new div for options summary to each column
             const choixAPlacerDiv = document.createElement('div');
             choixAPlacerDiv.className = 'choix-a-placer'; // Use class for styling
             colonne.appendChild(choixAPlacerDiv);

             const liste = document.createElement('ul'); liste.className = 'eleves-liste'; liste.dataset.colonne = nom; colonne.appendChild(liste);
             this.colonnesContainer.appendChild(colonne); this.initSortable(liste, nom); return colonne;
        }

        initSortable(element, columnName) {
             new Sortable(element, {
                 group: 'eleves', 
                 animation: 150, 
                 ghostClass: 'sortable-ghost', 
                 dragClass: 'sortable-drag',
                 onStart: (evt) => {
                     evt.item.classList.add('dragging');
                     // Store original column for potential warnings
                     evt.from._originalColumn = evt.from.dataset.colonne;
                 },
                 onMove: (evt) => {
                     const eleveId = parseInt(evt.dragged.dataset.id);
                     const targetCol = evt.to.dataset.colonne;
                     const student = this.eleves.find(e => e.id === eleveId);
                     
                     if (student) {
                         // Check relationships in target column
                         const relationships = this.checkStudentRelationshipsInColumn(student, targetCol);
                         
                         // Reset any previous warning classes
                         evt.dragged.classList.remove('move-warning-incompatible', 'move-warning-compatible');
                         
                         // Add warning classes based on relationship checks
                         if (relationships.incompatible) {
                             evt.dragged.classList.add('move-warning-incompatible');
                         } else if (relationships.compatible && student.colonne !== targetCol) {
                             evt.dragged.classList.add('move-warning-compatible');
                         }
                     }
                     return true; // Always allow the move
                 },
                 onEnd: (evt) => {
                     // Remove any warning classes
                     evt.item.classList.remove('dragging', 'move-warning-incompatible', 'move-warning-compatible');
                     
                     const eleveId = parseInt(evt.item.dataset.id);
                     const newCol = evt.to.dataset.colonne;
                     const eleve = this.eleves.find(e => e.id === eleveId);
                     
                     if (eleve && eleve.colonne !== newCol) {
                         // Check for incompatibilities in the new column
                         const relationships = this.checkStudentRelationshipsInColumn(eleve, newCol);
                         
                         if (relationships.incompatible) {
                             // Warn about incompatibility but still allow the move
                             const incompatibleWith = this.eleves.find(s => {
                                 return s.id !== eleve.id && 
                                        s.colonne === newCol && 
                                        this.areStudentsIncompatible(eleve, s);
                             });
                             
                             const incompatName = incompatibleWith ? 
                                 `${incompatibleWith.nom || ''} ${incompatibleWith.prenom || ''}`.trim() : 
                                 'un autre élève';
                                 
                             if (confirm(`Attention: ${eleve.nom || ''} ${eleve.prenom || ''} est incompatible avec ${incompatName} dans cette classe. Continuer quand même?`)) {
                                 eleve.colonne = newCol;
                                 this.sauvegarderDonnees();
                             } else {
                                 // Move back to original column
                                 eleve.colonne = evt.from._originalColumn || 'A placer';
                                 this.afficherEleves(); // Redraw to restore original position
                                 return;
                             }
                         } else if (relationships.compatible) {
                             // Just inform about compatibility
                             eleve.colonne = newCol;
                             this.sauvegarderDonnees();
                         } else {
                             // Normal move, no special relationships
                             eleve.colonne = newCol;
                             this.sauvegarderDonnees();
                         }
                     } else {
                         // No column change or no student found
                         this.mettreAJourCompteur();
                         this.updateStudentRelationshipIcons();
                     }
                 },
             });
        }

        supprimerColonne(nom) {
            if (nom === 'A placer') { alert("'A placer' non supprimable."); return; }
            if (confirm(`Supprimer colonne "${nom}" ? Élèves déplacés vers 'A placer'.`)) {
                this.eleves.forEach(e => { if (e.colonne === nom) e.colonne = 'A placer'; });
                const index = this.colonnes.indexOf(nom); if (index !== -1) this.colonnes.splice(index, 1);
                document.querySelector(`.colonne[data-nom="${nom}"]`)?.remove();
                this.sauvegarderDonnees(); this.afficherEleves();
            }
        }

        renommerColonne(ancienNom, nouveauNom) {
            const titreEl = document.querySelector(`.colonne[data-nom="${ancienNom}"] h2`);
            if (!nouveauNom || ancienNom === nouveauNom) { if (titreEl) titreEl.textContent = ancienNom; return; }
            if (nouveauNom === 'A placer') { alert("Interdit de renommer en 'A placer'."); if (titreEl) titreEl.textContent = ancienNom; return; }
            if (this.colonnes.includes(nouveauNom)) { alert(`Colonne "${nouveauNom}" existe déjà.`); if (titreEl) titreEl.textContent = ancienNom; return; }
            const index = this.colonnes.indexOf(ancienNom);
            if (index !== -1) {
                 this.colonnes[index] = nouveauNom; this.eleves.forEach(e => { if (e.colonne === ancienNom) e.colonne = nouveauNom; });
                 const colEl = document.querySelector(`.colonne[data-nom="${ancienNom}"]`);
                 if (colEl) {
                     colEl.dataset.nom = nouveauNom; if (titreEl) titreEl.textContent = nouveauNom;
                     colEl.querySelector('.compteur')?.setAttribute('data-colonne', nouveauNom);
                     colEl.querySelector('.eleves-liste')?.setAttribute('data-colonne', nouveauNom);
                     colEl.querySelector('.btn-supprimer-colonne')?.setAttribute('title', `Supprimer ${nouveauNom}`);
                 } this.sauvegarderDonnees(); this.mettreAJourCompteur();
            }
        }

        mettreAJourCompteur() {
            this.colonnes.forEach(nom => {
                const elevesCol = this.eleves.filter(e => e.colonne === nom); const n = elevesCol.length;
                const f = elevesCol.filter(e => e.sexe === 'F').length; const g = n - f; // Calculate boys based on total and girls
                const compteur = document.querySelector(`.compteur[data-colonne="${nom}"]`);
                if (compteur) compteur.innerHTML = `<strong>${n} = ${f} <i class="fa fa-female icon-female"></i> + ${g} <i class="fa fa-male icon-male"></i></strong>`;
                const moyenneDiv = document.querySelector(`.colonne[data-nom="${nom}"] .moyenne-generale`);
                if (moyenneDiv) {
                     const totalM = elevesCol.reduce((s, e) => s + (parseFloat(e.moyenne) || 0), 0);
                     const moyenneGenerale = n > 0 ? totalM / n : 0;
                     moyenneDiv.textContent = `Moy.= ${moyenneGenerale.toFixed(2)}`;
                     
                     // Réinitialiser toutes les classes de moyenne
                     moyenneDiv.classList.remove(
                         'moyenne-0-2', 'moyenne-2-4', 'moyenne-4-6', 'moyenne-6-8', 'moyenne-8-10',
                         'moyenne-10-12', 'moyenne-12-14', 'moyenne-14-16', 'moyenne-16-18', 'moyenne-18-20'
                     );
                     
                     // Appliquer la classe appropriée selon la valeur de la moyenne
                     if (moyenneGenerale >= 0 && moyenneGenerale < 2) moyenneDiv.classList.add('moyenne-0-2');
                     else if (moyenneGenerale < 4) moyenneDiv.classList.add('moyenne-2-4');
                     else if (moyenneGenerale < 6) moyenneDiv.classList.add('moyenne-4-6');
                     else if (moyenneGenerale < 8) moyenneDiv.classList.add('moyenne-6-8');
                     else if (moyenneGenerale < 10) moyenneDiv.classList.add('moyenne-8-10');
                     else if (moyenneGenerale < 12) moyenneDiv.classList.add('moyenne-10-12');
                     else if (moyenneGenerale < 14) moyenneDiv.classList.add('moyenne-12-14');
                     else if (moyenneGenerale < 16) moyenneDiv.classList.add('moyenne-14-16');
                     else if (moyenneGenerale < 18) moyenneDiv.classList.add('moyenne-16-18');
                     else if (moyenneGenerale <= 20) moyenneDiv.classList.add('moyenne-18-20');
                }
                this.updateColumnSummary(nom);
            });
        }

        // --- Modal Management ---

        // --- Modal Management ---

        // Helper method to fill the form with student data
    remplirFormulaire(eleve) {
        document.getElementById('classe').value = eleve.classe || '';
        document.getElementById('eleve').value = `${eleve.nom || ''} ${eleve.prenom || ''}`.trim();
        const sexeRadio = this.eleveForm.querySelector(`input[name="sexe"][value="${eleve.sexe}"]`);
        if (sexeRadio) sexeRadio.checked = true; // Use property for live state
        document.getElementById('moyenne').value = eleve.moyenne || '';
        document.getElementById('lv1').value = eleve.lv1 || ''; 
        document.getElementById('lv2').value = eleve.lv2 || '';
        document.getElementById('option1').value = eleve.options?.[0] || '';
        document.getElementById('option2').value = eleve.options?.[1] || '';
        document.getElementById('option3').value = eleve.options?.[2] || '';
        document.getElementById('compatible').value = eleve.options?.[3] || '';
        document.getElementById('incompatible').value = eleve.options?.[4] || '';
    }

    ouvrirModal(action, eleve = null) {
            this.modalTitle.textContent = action === 'ajouter' ? 'Ajouter un élève' : 'Modifier un élève';
            this.eleveForm.reset();
            // Ensure radio buttons are fully reset visually
            this.eleveForm.querySelectorAll('input[name="sexe"]').forEach(radio => radio.checked = false);

            if (action === 'modifier' && eleve) {
                this.currentEleveId = eleve.id;
                // Use the helper method to fill the form
                this.remplirFormulaire(eleve);
                this.deleteButton.classList.remove('hidden');
            } else { this.currentEleveId = null; this.deleteButton.classList.add('hidden'); }
            this.eleveModal.classList.remove('hidden'); document.getElementById('eleve').focus();
        }

        fermerModal() {
            this.eleveModal.classList.add('hidden'); this.settingsModal.classList.add('hidden');
            this.eleveForm.reset(); this.deleteButton.classList.add('hidden'); this.currentEleveId = null;
        }

        // --- Import / Export ---

        creerEtTelechargerModeleCSV() {
            const headers = "Classe,Élève,Sexe,Moyenne,LV1,LV2,Option1,Option2,Option3,Compatible,Incompatible";
            const blob = new Blob(["\ufeff", headers + "\n"], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "Modele_Import_Eleves.csv";
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        }

        importerCSV(event) {
            const file = event.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const contents = e.target.result; const lines = contents.split(/[\r\n]+/).map(l => l.trim()).filter(l => l);
                if (lines.length < 2) { alert("Fichier CSV vide ou en-tête seul."); this.csvFileInput.value = ''; return; }
                const headers = lines[0].split(',').map(h => h.trim()); const expectedHeaderCount = 11;
                if (headers.length < expectedHeaderCount) { alert(`Format CSV incorrect. Attendu ${expectedHeaderCount}+ colonnes. Trouvé ${headers.length}.`); this.csvFileInput.value = ''; return; }
                const nouveauxEleves = []; let errors = [];
                for (let i = 1; i < lines.length; i++) {
                    // Use more robust CSV parsing logic if needed (e.g., PapaParse library)
                    const values = lines[i].split(',').map(v => v.trim()); // Simple split, may fail with commas in fields
                    if (values.length < expectedHeaderCount) { errors.push(`Ligne ${i + 1}: ${values.length} colonnes (attendu ${expectedHeaderCount}+).`); continue; }

                    // Parse name assuming "NOM Prénom" format in CSV
                    const fullName = values[1]; const parts = fullName.split(' ').filter(p => p);
                    let nomCsv = '', prenomCsv = '';
                    if (parts.length === 1) nomCsv = parts[0];
                    else if (parts.length > 1) { nomCsv = parts.slice(0, -1).join(' '); prenomCsv = parts.slice(-1)[0]; }

                    const sexe = values[2]?.toUpperCase(); const moyVal = values[3]?.replace(',', '.'); const moy = parseFloat(moyVal); const lv1 = values[4]; const lv2 = values[5];
                    const options = values.slice(6, 11); // Opt1-5 (Indices 6-10)

                    // Validate imported data
                    if (!nomCsv) { errors.push(`Ligne ${i + 1}: Nom manquant ou invalide.`); continue; }
                    if (sexe !== 'M' && sexe !== 'F') { errors.push(`Ligne ${i + 1}: Sexe invalide ('${values[2]}').`); continue; }
                    if (isNaN(moy) || moy < 0 || moy > 20) { errors.push(`Ligne ${i + 1}: Moyenne invalide ('${values[3]}').`); continue; }

                    nouveauxEleves.push({
                        id: Date.now() + i, 
                        nom: nomCsv, 
                        prenom: prenomCsv, 
                        sexe: sexe, 
                        moyenne: moyVal,
                        lv1: lv1, 
                        lv2: lv2, 
                        options: options.map(opt => opt.trim()), // Ensure options are trimmed
                        classe: values[0], // Ajouter la classe depuis la première colonne du CSV
                        colonne: 'A placer'
                    });
                }
                if (errors.length > 0) { alert(`Import annulé:\n- ${errors.join('\n- ')}`); this.csvFileInput.value = ''; return; }
                if (nouveauxEleves.length > 0 && confirm(`Importer ${nouveauxEleves.length} élève(s) ?`)) {
                    this.eleves = this.eleves.concat(nouveauxEleves); this.sauvegarderDonnees(); this.afficherEleves(); alert(`${nouveauxEleves.length} élève(s) importé(s).`);
                } else if (nouveauxEleves.length === 0) alert("Aucun élève valide trouvé.");
                this.csvFileInput.value = '';
            };
            reader.onerror = (error) => { console.error('Erreur lecture CSV:', error); alert('Erreur lecture fichier.'); this.csvFileInput.value = ''; };
            reader.readAsText(file, 'UTF-8');
        }

        exporterDonneesCSV() {
             if (this.eleves.length === 0) { alert("Aucun élève à exporter."); return; }
             const headers = ["Classe", "Élève", "Sexe", "Moyenne", "LV1", "LV2", "Option1", "Option2", "Option3", "Compatible", "Incompatible"];
             const csvRows = [headers.join(',')];
             this.eleves.forEach(e => {
                 // Export name as "NOM Prénom"
                 const eleveName = `${e.nom || ''} ${e.prenom || ''}`.trim();
                 const row = [ e.colonne || 'A placer', `"${eleveName}"`, // Quote name field
                     e.sexe || '', (e.moyenne || '').toString().replace('.', ','), // Use comma for average
                     e.lv1 || '', e.lv2 || '', e.options?.[0] || '', e.options?.[1] || '', e.options?.[2] || '', e.options?.[3] || '', e.options?.[4] || '', ];
                 // Basic quoting for fields containing commas
                 csvRows.push(row.map(f => typeof f === 'string' && f.includes(',') ? `"${f.replace(/"/g, '""')}"` : f).join(','));
             });
             const csvString = csvRows.join('\r\n'); const blob = new Blob(["\ufeff", csvString], { type: 'text/csv;charset=utf-8;' });
             const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Export_Classes_${new Date().toISOString().slice(0, 10)}.csv`;
             document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        }

        // --- Student Relationship Handling ---

        // Get normalized full name for comparison
        getNormalizedFullName(student) {
            return `${student.nom || ''} ${student.prenom || ''}`.trim().toLowerCase();
        }

        // Find student by name
        findStudentByName(fullName) {
            const normalizedName = fullName.trim().toLowerCase();
            return this.eleves.find(student => {
                const studentFullName = this.getNormalizedFullName(student);
                return studentFullName === normalizedName;
            });
        }

        // Check if two students are compatible
        areStudentsCompatible(student1, student2) {
            if (!student1 || !student2 || student1.id === student2.id) return false;
            
            const name1 = this.getNormalizedFullName(student1);
            const name2 = this.getNormalizedFullName(student2);
            
            const compat1 = (student1.options?.[3] || '').trim().toLowerCase();
            const compat2 = (student2.options?.[3] || '').trim().toLowerCase();
            
            // Vérifier si le nom compatible correspond à l'élève 2
            const isCompat1WithStudent2 = compat1 === name2 || 
                                         this.findStudentByName(compat1)?.id === student2.id;
            
            // Vérifier si le nom compatible correspond à l'élève 1
            const isCompat2WithStudent1 = compat2 === name1 || 
                                         this.findStudentByName(compat2)?.id === student1.id;
            
            // Mutual compatibility check
            return (isCompat1WithStudent2 && isCompat2WithStudent1);
        }

        // Check if two students are incompatible
        areStudentsIncompatible(student1, student2) {
            if (!student1 || !student2 || student1.id === student2.id) return false;
            
            const name1 = this.getNormalizedFullName(student1);
            const name2 = this.getNormalizedFullName(student2);
            
            const incompat1 = (student1.options?.[4] || '').trim().toLowerCase();
            const incompat2 = (student2.options?.[4] || '').trim().toLowerCase();
            
            // Vérifier si le nom incompatible correspond à l'élève 2
            const isIncompat1WithStudent2 = incompat1 === name2 || 
                                           this.findStudentByName(incompat1)?.id === student2.id;
            
            // Vérifier si le nom incompatible correspond à l'élève 1
            const isIncompat2WithStudent1 = incompat2 === name1 || 
                                           this.findStudentByName(incompat2)?.id === student1.id;
            
            // One-way incompatibility is enough
            return (isIncompat1WithStudent2 || isIncompat2WithStudent1);
        }

        // Check compatibility/incompatibility when moving a student
        checkStudentRelationshipsInColumn(student, columnName) {
            if (!student || !columnName) return { compatible: false, incompatible: false };
            
            const studentsInColumn = this.eleves.filter(s => s.colonne === columnName && s.id !== student.id);
            let hasIncompatible = false;
            
            // Check for incompatibilities in the target column
            for (const otherStudent of studentsInColumn) {
                if (this.areStudentsIncompatible(student, otherStudent)) {
                    hasIncompatible = true;
                    break;
                }
            }
            
            // Check for compatibilities in other columns
            const compatibleStudent = this.eleves.find(s => {
                return s.id !== student.id && 
                       s.colonne !== columnName && 
                       this.areStudentsCompatible(student, s);
            });
            
            return {
                compatible: !!compatibleStudent,
                incompatible: hasIncompatible
            };
        }

        // Enhanced relationship icon update function
        updateStudentRelationshipIcons() {
            // Clear existing icons and highlights first
            document.querySelectorAll('.eleve-item .incompatibility-icon, .eleve-item .compatibility-icon').forEach(icon => icon.remove());
            document.querySelectorAll('.eleve-item.incompatible-pair, .eleve-item.compatible-pair').forEach(item => {
                item.classList.remove('incompatible-pair', 'compatible-pair');
            });

            const studentElements = {}; // Map ID to DOM element
            document.querySelectorAll('.eleve-item[data-id]').forEach(el => {
                studentElements[el.dataset.id] = el;
            });

            const processedIncompat = new Set(), processedCompat = new Set();

            // Process all students
            this.eleves.forEach(student1 => {
                const el1 = studentElements[student1.id]; 
                if (!el1) return;

                // Check against all other students
                this.eleves.forEach(student2 => {
                    if (student1.id === student2.id) return;
                    const el2 = studentElements[student2.id];
                    if (!el2) return;
                    
                    // Create a unique key for this pair
                    const pairKey = [student1.id, student2.id].sort().join('-');
                    
                    // Check incompatibility (same column)
                    if (student1.colonne === student2.colonne && 
                        this.areStudentsIncompatible(student1, student2) && 
                        !processedIncompat.has(pairKey)) {
                        
                        processedIncompat.add(pairKey);
                        this.addIncompatibilityMarker(el1, student2);
                        this.addIncompatibilityMarker(el2, student1);
                    }
                    
                    // Check compatibility (different columns)
                    if (student1.colonne !== student2.colonne && 
                        this.areStudentsCompatible(student1, student2) && 
                        !processedCompat.has(pairKey)) {
                        
                        processedCompat.add(pairKey);
                        this.addCompatibilityMarker(el1, student2);
                        this.addCompatibilityMarker(el2, student1);
                    }
                });
            });
        }

        addIncompatibilityMarker(element, otherStudent) {
            if (element && !element.querySelector('.incompatibility-icon')) {
                const icon = document.createElement('i'); 
                icon.className = 'fas fa-user-minus text-danger incompatibility-icon';
                
                // Enhanced tooltip with more information
                icon.title = `Incompatible avec ${otherStudent.nom || ''} ${otherStudent.prenom || ''}`.trim();
                
                // Placer l'icône juste après le prénom (élément strong)
                const nameElement = element.querySelector('strong');
                if (nameElement) nameElement.insertAdjacentElement('afterend', icon);
                else element.appendChild(icon);
                element.classList.add('incompatible-pair');
                
                // Add click event to highlight the incompatible student
                icon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.highlightRelatedStudent(otherStudent.id);
                });
            }
        }

        addCompatibilityMarker(element, otherStudent) {
            if (element && !element.querySelector('.compatibility-icon')) {
                const icon = document.createElement('i'); 
                icon.className = 'fas fa-user-plus text-success compatibility-icon';
                
                // Enhanced tooltip with more information
                icon.title = `À regrouper avec ${otherStudent.nom || ''} ${otherStudent.prenom || ''} (${otherStudent.colonne || 'A placer'})`.trim();
                
                // Placer l'icône après l'icône d'incompatibilité si elle existe, sinon après le prénom
                const incompatIcon = element.querySelector('.incompatibility-icon');
                const nameElement = element.querySelector('strong');
                
                if (incompatIcon) incompatIcon.insertAdjacentElement('afterend', icon);
                else if (nameElement) nameElement.insertAdjacentElement('afterend', icon);
                else element.appendChild(icon);
                
                element.classList.add('compatible-pair');
                
                // Add click event to highlight the compatible student
                icon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.highlightRelatedStudent(otherStudent.id);
                });
            }
        }
        
        // Highlight a related student when clicking on relationship icon
        highlightRelatedStudent(studentId) {
            // Remove any existing highlights
            document.querySelectorAll('.eleve-item.highlight-related').forEach(el => {
                el.classList.remove('highlight-related');
            });
            
            // Add highlight to the target student
            const targetElement = document.querySelector(`.eleve-item[data-id="${studentId}"]`);
            if (targetElement) {
                targetElement.classList.add('highlight-related');
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Remove highlight after 3 seconds
                setTimeout(() => {
                    targetElement.classList.remove('highlight-related');
                }, 3000);
            }
        }

        updateColumnSummary(nomColonne) {
            const elevesDansColonne = this.eleves.filter(e => e.colonne === nomColonne);
            const summary = {
                lv1: {},
                lv2: {},
                option1: {},
                option2: {},
                option3: {}
            };

            elevesDansColonne.forEach(eleve => {
                // LV1
                if (eleve.lv1) {
                    const lv1Key = eleve.lv1.toUpperCase();
                    summary.lv1[lv1Key] = (summary.lv1[lv1Key] || 0) + 1;
                }
                // LV2
                if (eleve.lv2) {
                    const lv2Key = eleve.lv2.toUpperCase();
                    summary.lv2[lv2Key] = (summary.lv2[lv2Key] || 0) + 1;
                }
                // Options (assuming options array is always present and has at least 3 elements)
                if (eleve.options && eleve.options.length >= 3) {
                    if (eleve.options[0]) {
                        const opt1Key = eleve.options[0].toUpperCase();
                        summary.option1[opt1Key] = (summary.option1[opt1Key] || 0) + 1;
                    }
                    if (eleve.options[1]) {
                        const opt2Key = eleve.options[1].toUpperCase();
                        summary.option2[opt2Key] = (summary.option2[opt2Key] || 0) + 1;
                    }
                    if (eleve.options[2]) {
                        const opt3Key = eleve.options[2].toUpperCase();
                        summary.option3[opt3Key] = (summary.option3[opt3Key] || 0) + 1;
                    }
                }
            });

            const colonneEl = document.querySelector(`.colonne[data-nom="${nomColonne}"]`);
            if (!colonneEl) return;
            const choixAPlacerDiv = colonneEl.querySelector('.choix-a-placer');

            if (choixAPlacerDiv) {
                let htmlContent = '';

                const formatSummary = (title, data) => {
                    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]); // Sort by count descending
                    if (entries.length === 0) return '';
                    const itemsHtml = entries.map(([key, count]) => {
                        let abbreviation = key.substring(0, 3);
                        let colorClass = '';
                        // Apply specific colors for known languages
                        if (key.includes('ANGLAIS')) { abbreviation = 'ANG'; colorClass = 'lv-anglais'; }
                        else if (key.includes('ITALIEN')) { abbreviation = 'ITA'; colorClass = 'lv-italien'; }
                        else if (key.includes('ALLEMAND')) { abbreviation = 'ALL'; colorClass = 'lv-allemand'; }
                        else if (key.includes('ESPAGNOL')) { abbreviation = 'ESP'; colorClass = 'lv-espanol'; }
                        else {
                            // For other options, use generic option colors or a default
                            if (title.includes('LV1')) colorClass = 'summary-lv1-color';
                            else if (title.includes('LV2')) colorClass = 'summary-lv2-color';
                            else if (title.includes('Option1')) colorClass = 'summary-opt1-color';
                            else if (title.includes('Option2')) colorClass = 'summary-opt2-color';
                            else if (title.includes('Option3')) colorClass = 'summary-opt3-color';
                        }
                        return `<span class="compteur-item ${colorClass}" title="${key}" data-option-key="${key}" data-option-type="${title.toLowerCase()}">${abbreviation} = ${count}</span>`;
                    }).join('');
                    return `<div class="summary-category"><strong>${title}:</strong> ${itemsHtml}</div>`;
                };

                choixAPlacerDiv.innerHTML = ''; // Clear existing content


                const lvContainer = document.createElement('div');
                lvContainer.className = 'summary-line';
                lvContainer.innerHTML += formatSummary('LV1', summary.lv1);
                lvContainer.innerHTML += formatSummary('LV2', summary.lv2);
                choixAPlacerDiv.appendChild(lvContainer);

                const optionsContainer = document.createElement('div');
                optionsContainer.className = 'summary-line';
                optionsContainer.innerHTML += formatSummary('Option1', summary.option1);
                optionsContainer.innerHTML += formatSummary('Option2', summary.option2);
                optionsContainer.innerHTML += formatSummary('Option3', summary.option3);
                choixAPlacerDiv.appendChild(optionsContainer);
            }
        }

        // Performant method to re-order DOM elements instead of rebuilding them
        rafraichirToutesLesColonnes() {
            const allItemsMap = new Map();
            document.querySelectorAll('.eleve-item[data-id]').forEach(item => {
                allItemsMap.set(item.dataset.id, item);
            });

            const lists = {};
            this.colonnes.forEach(nom => {
                lists[nom] = document.querySelector(`.eleves-liste[data-colonne="${nom}"]`);
            });

            // Iterate through the master sorted list of students
            // and append their corresponding DOM elements to the correct column list.
            // Appending an element that is already in the DOM moves it.
            this.eleves.forEach(eleve => {
                const eleveIdStr = String(eleve.id);
                const item = allItemsMap.get(eleveIdStr);
                if (item) {
                    const colName = eleve.colonne && this.colonnes.includes(eleve.colonne) ? eleve.colonne : 'A placer';
                    const listElement = lists[colName];
                    if (listElement) {
                        listElement.appendChild(item);
                    }
                }
            });

            // Update counters and relationship icons as they depend on the new structure
            this.mettreAJourCompteur();
            this.updateStudentRelationshipIcons();
        }

        // Sorts students by a specific option
        trierParOption(optionKey, optionType, nomColonne) {
            const getOptionValue = (eleve, type) => {
                switch (type) {
                    case 'lv1': return eleve.lv1 || '';
                    case 'lv2': return eleve.lv2 || '';
                    case 'option1': return eleve.options?.[0] || '';
                    case 'option2': return eleve.options?.[1] || '';
                    case 'option3': return eleve.options?.[2] || '';
                    default: return '';
                }
            };

            // Greatly improve performance by only sorting the relevant part of the array
            const elevesDansColonne = this.eleves.filter(e => e.colonne === nomColonne);
            const autresEleves = this.eleves.filter(e => e.colonne !== nomColonne);

            elevesDansColonne.sort((a, b) => {
                const aHasOption = (getOptionValue(a, optionType) || '').toUpperCase() === optionKey;
                const bHasOption = (getOptionValue(b, optionType) || '').toUpperCase() === optionKey;

                // Prioritize students with the selected option
                if (aHasOption && !bHasOption) return -1;
                if (!aHasOption && bHasOption) return 1;

                // Secondary sort: alphabetical
                const nomCompare = (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' });
                return nomCompare !== 0 ? nomCompare : (a.prenom || '').localeCompare(b.prenom || '', 'fr', { sensitivity: 'base' });
            });

            // Recombine the master list
            this.eleves = [...elevesDansColonne, ...autresEleves];

            this.sauvegarderDonnees();
            this.rafraichirToutesLesColonnes();
            this.triggerSortAnimation();
        }


    } // End class GestionEleves

    const app = new GestionEleves(); // Initialize

}); // End DOMContentLoaded

// Add this to your existing JavaScript file

// Groups functionality
let studentGroups = JSON.parse(localStorage.getItem('studentGroups')) || [];

// Open groups modal
document.getElementById('groups-button').addEventListener('click', function() {
    document.getElementById('groups-modal').classList.remove('hidden');
    renderGroupsList();
});

// Close groups modal
document.querySelector('#groups-modal .close').addEventListener('click', function() {
    document.getElementById('groups-modal').classList.add('hidden');
});

// Validate groups button
document.getElementById('validate-groups-button').addEventListener('click', function() {
    // Ferme la fenêtre modale et sauvegarde les modifications
    document.getElementById('groups-modal').classList.add('hidden');
    // Les modifications ont déjà été sauvegardées lors de l'édition ou de la création des groupes
    // Mettre à jour l'affichage des élèves pour refléter les changements
    updateStudentCards();
});

// Fonction pour réinitialiser le formulaire et l'état d'édition
function resetGroupForm() {
    document.getElementById('group-name').value = '';
    document.getElementById('group-name').dataset.editingGroupId = '';
    
    // Afficher le bouton Créer et masquer les boutons Modifier et Annuler
    document.getElementById('create-group-button').classList.remove('hidden');
    document.getElementById('modify-group-button').classList.add('hidden');
    document.getElementById('cancel-edit-button').classList.add('hidden');
}

// Créer un nouveau groupe
document.getElementById('create-group-button').addEventListener('click', function() {
    const groupName = document.getElementById('group-name').value.trim();
    
    if (!groupName) {
        alert('Veuillez saisir un nom de groupe');
        return;
    }
    
    // Créer un nouveau groupe
    const selectedColor = document.querySelector('input[name="group-color"]:checked').value;
    const newGroup = {
        id: Date.now().toString(),
        name: groupName,
        students: [],
        color: selectedColor
    };
    
    // Les élèves seront ajoutés manuellement dans la vue détaillée
    
    studentGroups.push(newGroup);
    saveGroups();
    renderGroupsList();
    
    // Réinitialiser le formulaire
    resetGroupForm();
    
    // Mettre à jour l'interface pour afficher les élèves groupés
    updateStudentCards();
});

// Modifier un groupe existant
document.getElementById('modify-group-button').addEventListener('click', function() {
    const groupName = document.getElementById('group-name').value.trim();
    
    // Les champs critère et valeur ont été supprimés, on utilise des valeurs par défaut
    const groupCriteria = 'custom'; // Valeur par défaut
    const groupValue = ''; // Valeur par défaut
    
    const editingGroupId = document.getElementById('group-name').dataset.editingGroupId;
    
    if (!groupName) {
        alert('Veuillez saisir un nom de groupe');
        return;
    }
    
    if (!editingGroupId) {
        alert('Erreur: Aucun groupe à modifier');
        return;
    }
    
    // Trouver le groupe en cours d'édition
    const groupIndex = studentGroups.findIndex(g => g.id === editingGroupId);
    
    if (groupIndex !== -1) {
        // Stocker les élèves actuels du groupe
        const currentStudents = studentGroups[groupIndex].students;
        
        // Mettre à jour les propriétés du groupe
        const selectedColor = document.querySelector('input[name="group-color"]:checked').value;
        studentGroups[groupIndex].name = groupName;
        studentGroups[groupIndex].criteria = groupCriteria;
        studentGroups[groupIndex].value = groupValue;
        studentGroups[groupIndex].color = selectedColor;
        
        // Si le critère a changé ou si la valeur a changé et que ce n'est pas un groupe personnalisé, mettre à jour les élèves automatiquement
        const criteriaChanged = groupCriteria !== studentGroups[groupIndex].criteria;
        const valueChanged = groupValue.toUpperCase() !== studentGroups[groupIndex].value.toUpperCase();
        
        if (groupCriteria !== 'custom' && (criteriaChanged || valueChanged)) {
            // Réinitialiser la liste des élèves
            studentGroups[groupIndex].students = [];
            
            // Ajouter les élèves correspondant aux nouveaux critères
            const allStudents = getAllStudents();
            allStudents.forEach(student => {
                if (student[groupCriteria] && student[groupCriteria].toUpperCase() === groupValue.toUpperCase()) {
                    studentGroups[groupIndex].students.push(student.id);
                }
            });
        }
        
        // Sauvegarder les modifications
        saveGroups();
        renderGroupsList();
        
        // Réinitialiser le formulaire et l'état d'édition
        resetGroupForm();
        
        // Mettre à jour l'interface
        updateStudentCards();
        
        // Afficher un message de succès
        alert('Groupe mis à jour avec succès');
    } else {
        alert('Erreur: Groupe non trouvé');
    }
});

// Annuler l'édition
document.getElementById('cancel-edit-button').addEventListener('click', function() {
    resetGroupForm();
});

// Save groups to localStorage
function saveGroups() {
    localStorage.setItem('studentGroups', JSON.stringify(studentGroups));
}

// Render the list of groups
function renderGroupsList() {
    const groupsList = document.getElementById('groups-list');
    groupsList.innerHTML = '';
    
    if (studentGroups.length === 0) {
        groupsList.innerHTML = '<li>Aucun groupe créé</li>';
        return;
    }
    
    studentGroups.forEach(group => {
        const groupItem = document.createElement('li');
        groupItem.className = 'group-item';
        groupItem.innerHTML = `
            <div class="group-info">
                <strong style="color: var(--${group.color || 'dark-blue'}-color)">${group.name}</strong> (${group.students.length} élèves)
            </div>
            <div class="group-actions">
                <button class="btn-small view-group" data-id="${group.id}"><i class="fas fa-eye"></i></button>
                <button class="btn-small edit-group" data-id="${group.id}"><i class="fas fa-edit"></i></button>
                <button class="btn-small delete-group btn-del" data-id="${group.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        groupsList.appendChild(groupItem);
    });
    
    // Add event listeners for group actions
    document.querySelectorAll('.delete-group').forEach(button => {
        button.addEventListener('click', function() {
            const groupId = this.getAttribute('data-id');
            if (confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) {
                studentGroups = studentGroups.filter(group => group.id !== groupId);
                saveGroups();
                renderGroupsList();
                updateStudentCards();
            }
        });
    });
    
    // Add event listeners for view group button
    document.querySelectorAll('.view-group').forEach(button => {
        button.addEventListener('click', function() {
            const groupId = this.getAttribute('data-id');
            const group = studentGroups.find(g => g.id === groupId);
            if (group) {
                showGroupDetailView(group);
            }
        });
    });
    
    // Add event listener for back button in group detail view
    document.getElementById('back-to-groups-button').addEventListener('click', function() {
        document.querySelector('.groups-container').classList.remove('hidden');
        document.getElementById('group-detail-view').classList.add('hidden');
        renderGroupsList(); // Actualiser la liste des groupes pour mettre à jour les compteurs
    });
    
    // Function to show the detailed group view
    function showGroupDetailView(group) {
        // Hide the groups list and show the detail view
        document.querySelector('.groups-container').classList.add('hidden');
        document.getElementById('group-detail-view').classList.remove('hidden');
        
        // Update the group header information
        document.getElementById('group-detail-name').textContent = group.name;
        document.getElementById('group-detail-info').textContent = '';
        
        // Get all students
        const allStudents = getAllStudents();
        
        // Separate students into group members and others
        const groupMembers = [];
        const otherStudents = [];
        
        allStudents.forEach(student => {
            if (group.students.includes(student.id)) {
                groupMembers.push(student);
            } else {
                otherStudents.push(student);
            }
        });
        
        // Update counters
        document.getElementById('group-members-counter').textContent = `${groupMembers.length} élèves`;
        document.getElementById('other-students-counter').textContent = `${otherStudents.length} élèves`;
        
        // Render group members
        renderStudentsList(groupMembers, 'group-members-list', true, group.id);
        
        // Render other students
        renderStudentsList(otherStudents, 'other-students-list', false, group.id);
    }
    
    // Function to render a list of students
    function renderStudentsList(students, containerId, isGroupMember, groupId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        if (students.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-list-message';
            emptyMessage.textContent = isGroupMember ? 'Aucun élève dans ce groupe' : 'Aucun autre élève disponible';
            container.appendChild(emptyMessage);
            return;
        }
        
        // Sort students alphabetically by name
        students.sort((a, b) => {
            const nameA = `${a.nom || ''} ${a.prenom || ''}`.trim();
            const nameB = `${b.nom || ''} ${b.prenom || ''}`.trim();
            return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
        });
        
        students.forEach(student => {
            const li = document.createElement('li');
            li.className = 'group-student-item';
            li.dataset.id = student.id;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = `student-name ${student.sexe === 'M' ? 'male' : (student.sexe === 'F' ? 'female' : '')}`;
            nameSpan.textContent = `${student.nom || ''} ${student.prenom || ''}`.trim();
            li.appendChild(nameSpan);

            // Vérifier si l'élève appartient à d'autres groupes
            const otherGroups = studentGroups.filter(g => 
                g.id !== groupId && 
                g.students.includes(student.id)
            );
            
            if (otherGroups.length > 0) {
                const groupInfo = document.createElement('span');
                groupInfo.className = 'group-info-tag';
                groupInfo.textContent = `(${otherGroups.map(g => g.name).join(', ')})`;
                groupInfo.style.marginLeft = '8px';
                groupInfo.style.fontSize = '0.9em';
                groupInfo.style.color = '#666';
                li.appendChild(groupInfo);
            }
            
            // Add action button (add or remove)
            const actionButton = document.createElement('button');
            actionButton.className = `group-action-button ${isGroupMember ? 'remove-from-group' : 'add-to-group'}`;
            actionButton.innerHTML = isGroupMember ? 
                '<i class="fas fa-user-minus"></i>' : 
                '<i class="fas fa-user-plus"></i>';
            actionButton.title = isGroupMember ? 'Retirer du groupe' : 'Ajouter au groupe';
            actionButton.dataset.studentId = student.id;
            actionButton.dataset.groupId = groupId;
            
            // Add event listener for the action button
            actionButton.addEventListener('click', function() {
                const studentId = this.dataset.studentId;
                const groupId = this.dataset.groupId;
                
                if (isGroupMember) {
                    removeStudentFromGroup(studentId, groupId);
                } else {
                    addStudentToGroup(studentId, groupId);
                }
            });
            
            li.appendChild(actionButton);
            container.appendChild(li);
        });
    }
    
    // Function to add a student to a group
    function addStudentToGroup(studentId, groupId) {
        const group = studentGroups.find(g => g.id === groupId);
        if (!group) return;
        
        if (!group.students.includes(studentId)) {
            group.students.push(studentId);
            saveGroups();
            updateStudentCards();
            
            // Récupérer les listes d'élèves mises à jour
            const allStudents = getAllStudents();
            const groupMembers = allStudents.filter(student => group.students.includes(student.id));
            const otherStudents = allStudents.filter(student => !group.students.includes(student.id));
            
            // Mettre à jour les compteurs avant de rafraîchir la vue
            updateGroupCounters(groupMembers, otherStudents);
            
            // Mettre à jour immédiatement les listes d'élèves
            // Vider et reconstruire la liste des membres du groupe
            const membersContainer = document.getElementById('group-members-list');
            membersContainer.innerHTML = '';
            renderStudentsList(groupMembers, 'group-members-list', true, group.id);
            
            // Vider et reconstruire la liste des autres élèves
            const othersContainer = document.getElementById('other-students-list');
            othersContainer.innerHTML = '';
            renderStudentsList(otherStudents, 'other-students-list', false, group.id);
            
            // Mettre à jour les compteurs
            document.getElementById('group-members-counter').textContent = `${groupMembers.length} élèves`;
            document.getElementById('other-students-counter').textContent = `${otherStudents.length} élèves`;
        }
    }
    
    // Function to update group counters
    function updateGroupCounters(groupMembers, otherStudents) {
        // Update the counters in the UI
        document.getElementById('group-members-counter').textContent = `${groupMembers.length} élèves`;
        document.getElementById('other-students-counter').textContent = `${otherStudents.length} élèves`;
    }
    
    // Function to remove a student from a group
    function removeStudentFromGroup(studentId, groupId) {
        const group = studentGroups.find(g => g.id === groupId);
        if (!group) return;
        
        group.students = group.students.filter(id => id !== studentId);
        saveGroups();
        updateStudentCards();
        
        // Récupérer les listes d'élèves mises à jour
        const allStudents = getAllStudents();
        const groupMembers = allStudents.filter(student => group.students.includes(student.id));
        const otherStudents = allStudents.filter(student => !group.students.includes(student.id));
        
        // Mettre à jour les compteurs avant de rafraîchir la vue
        updateGroupCounters(groupMembers, otherStudents);
        
        // Refresh the detail view
        showGroupDetailView(group);
    }
    
    // Add event listeners for edit group button
    document.querySelectorAll('.edit-group').forEach(button => {
        button.addEventListener('click', function() {
            const groupId = this.getAttribute('data-id');
            const group = studentGroups.find(g => g.id === groupId);
            if (group) {
                // Stocke l'ID du groupe en cours d'édition pour le récupérer lors de la modification
                document.getElementById('group-name').dataset.editingGroupId = groupId;
                document.getElementById('group-name').value = group.name;
                
                // Désélectionner toutes les couleurs
                document.querySelectorAll('input[name="group-color"]').forEach(radio => {
                    radio.checked = false;
                });
                
                // Présélectionner la couleur du groupe si elle existe
                const colorRadio = document.querySelector(`input[name="group-color"][value="${group.color}"]`);
                if (colorRadio) {
                    colorRadio.checked = true;
                }
                
                // Vérifier si les éléments existent avant de définir leurs valeurs
                const criteriasElement = document.getElementById('group-criteria');
                if (criteriasElement) {
                    criteriasElement.value = group.criteria;
                }
                
                const valueElement = document.getElementById('group-value');
                if (valueElement) {
                    valueElement.value = group.value;
                }
                
                // Afficher les boutons de modification et d'annulation, masquer le bouton de création
                document.getElementById('create-group-button').classList.add('hidden');
                document.getElementById('modify-group-button').classList.remove('hidden');
                document.getElementById('cancel-edit-button').classList.remove('hidden');
                
                // Ne pas supprimer le groupe tant que l'utilisateur n'a pas validé les modifications
                // Le groupe sera mis à jour lors du clic sur le bouton "Modifier"
            }
        });
    });
}

// Get all students from all columns
function getAllStudents() {
    const allStudents = [];
    const app = document.querySelector('.main-content').gestionEleves;
    
    if (app && app.eleves) {
        return app.eleves;
    } else {
        // Fallback method using DOM
        const columns = document.querySelectorAll('.colonne');
        
        columns.forEach(column => {
            const students = column.querySelectorAll('.eleve-item');
            students.forEach(student => {
                const studentId = student.getAttribute('data-id');
                if (studentId) {
                    // Find the student data in the app instance if possible
                    const studentData = app ? app.eleves.find(e => e.id == studentId) : null;
                    if (studentData) {
                        allStudents.push(studentData);
                    } else {
                        // Create minimal student data from DOM
                        allStudents.push({
                            id: studentId,
                            nom: student.querySelector('strong').textContent.trim(),
                            colonne: column.getAttribute('data-nom')
                        });
                    }
                }
            });
        });
        
        return allStudents;
    }
}

// Update student cards to show group indicators
function updateStudentCards() {
    const studentItems = document.querySelectorAll('.eleve-item');
    
    // First, remove all group indicators and color classes
    studentItems.forEach(item => {
        item.classList.remove('grouped');
        // Supprimer toutes les classes de couleur possibles
        item.classList.remove('dark-blue', 'light-blue', 'dark-green', 'light-green', 'yellow', 'orange', 'light-red', 'dark-red', 'black');
        // Supprimer les classes de couleur de fond des groupes
        item.classList.remove(
            'group-dark-purple', 'group-dark-blue', 'group-light-blue', 'group-dark-green', 
            'group-light-green', 'group-yellow', 'group-orange', 'group-light-red', 
            'group-dark-red', 'group-black'
        );
        const groupIndicators = item.querySelectorAll('.group-indicator');
        groupIndicators.forEach(indicator => indicator.remove());
    });
    
    // Then add new indicators
    studentItems.forEach(item => {
        const studentId = item.getAttribute('data-id');
        if (!studentId) return;
        
        const studentGroups = getStudentGroups(studentId);
        
        if (studentGroups.length > 0) {
            item.classList.add('grouped');
            
            // Ajouter la classe de couleur du premier groupe à l'élément élève
            // Cela permettra au marqueur vertical de prendre la bonne couleur
            if (studentGroups[0] && studentGroups[0].color) {
                const groupColor = studentGroups[0].color;
                item.classList.add(groupColor);
                
                // Ajouter la classe pour la couleur de fond avec transparence
                item.classList.add(`group-${groupColor}`);
            } else {
                item.classList.add('dark-blue'); // Couleur par défaut
                item.classList.add('group-dark-blue'); // Couleur de fond par défaut
            }
            
            // Add group indicators
            const nameElement = item.querySelector('strong');
            if (nameElement) {
                studentGroups.forEach(group => {
                    const indicator = document.createElement('span');
                    indicator.className = `group-indicator ${group.color || 'dark-blue'}`;
                    indicator.textContent = group.name;
                    indicator.title = `Groupe: ${group.name}`;
                    indicator.style.backgroundColor = `var(--${group.color || 'dark-blue'}-color)`;
                    item.appendChild(indicator);
                });
            }
        }
    });
}

// Get groups that a student belongs to
function getStudentGroups(studentId) {
    return studentGroups.filter(group => group.students.includes(studentId));
}

// This function is not needed as the Sortable initialization is already handled in the GestionEleves class
// We'll modify the existing initSortable method in the GestionEleves class instead

// Add a function to integrate group functionality with the existing Sortable implementation
function integrateGroupsWithSortable() {
    // Store a reference to the app instance for easier access
    const appElement = document.querySelector('.main-content');
    const app = appElement.gestionEleves;
    
    if (!app) return;
    
    // Extend the existing initSortable method to handle groups
    const originalInitSortable = app.initSortable;
    app.initSortable = function(element, columnName) {
        // Call the original method first
        const sortableInstance = originalInitSortable.call(this, element, columnName);
        
        // Add our group handling to the onEnd callback
        if (sortableInstance && sortableInstance.options) {
            const originalOnEnd = sortableInstance.options.onEnd;
            
            sortableInstance.options.onEnd = function(evt) {
                // Call the original onEnd first
                if (originalOnEnd) originalOnEnd.call(this, evt);
                
                // Get the moved student
                const studentItem = evt.item;
                const studentId = studentItem.getAttribute('data-id');
                
                if (!studentId) return;
                
                // Check if student is part of a group
                const studentGroups = getStudentGroups(studentId);
                
                if (studentGroups.length > 0) {
                    // Get all students in the same groups
                    const groupedStudentIds = new Set();
                    studentGroups.forEach(group => {
                        group.students.forEach(id => {
                            if (id !== studentId) {
                                groupedStudentIds.add(id);
                            }
                        });
                    });
                    
                    // Move all grouped students to the same column
                    if (groupedStudentIds.size > 0) {
                        const targetColumn = evt.to;
                        const allStudentItems = document.querySelectorAll('.eleve-item');
                        
                        allStudentItems.forEach(item => {
                            const itemId = item.getAttribute('data-id');
                            if (groupedStudentIds.has(itemId)) {
                                // Only move if not already in the target column
                                if (item.parentElement !== targetColumn) {
                                    targetColumn.appendChild(item);
                                }
                            }
                        });
                    }
                }
                
                // Update the app's data structure
                if (app.sauvegarderDonnees) {
                    app.sauvegarderDonnees();
                }
            };
        }
        
        return sortableInstance;
    };
}

// Initialize the group functionality
document.addEventListener('DOMContentLoaded', function() {
    // Store a reference to the app instance for easier access
    const appElement = document.querySelector('.main-content');
    if (appElement) {
        appElement.gestionEleves = document.querySelector('.main-content').__vue__ || window.app;
    }
    
    // Call updateStudentCards after the app has initialized
    setTimeout(function() {
        updateStudentCards();
        integrateGroupsWithSortable();
    }, 500);
});

// Add CSS for group indicators
const style = document.createElement('style');
style.textContent = `
.eleve-item.grouped {
    position: relative;
    /* Suppression de la bordure gauche verte fixe pour permettre au marqueur vertical de s'afficher correctement */
}

.group-indicator {
    display: inline-flex;
    font-size: 0.7em;
    font-weight: bold;
    padding: 1px 3px;
    margin-left: 4px;
    border-radius: 2px;
    background-color: #4CAF50;
    color: white;
    align-items: center;
    justify-content: center;
    min-width: 25px;
    text-align: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
}
`;
document.head.appendChild(style);

// Make sure to call these functions at the appropriate places in your existing code:
// 1. Call updateStudentCards() after you load and render your student data
// 2. Call initSortable() when initializing your app