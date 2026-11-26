<template>
  <div class="poi-page">

    <!-- Left: Character Directory -->
    <section class="poi-panel">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/npc.svg" />
        <h1>PERSONS OF INTEREST</h1>
      </div>

      <div class="poi-panel-body">
        <div v-if="editable" class="briefing-edit-actions poi-directory-actions">
          <button type="button" @click="$emit('edit-content', 'pois')">New POI</button>
        </div>
        <p v-if="persons.length === 0" class="briefing-empty">No POIs available.</p>
        <button
          v-for="person in persons"
          :key="person.id"
          type="button"
          class="poi-entry"
          :class="{ selected: selectedPerson.id === person.id }"
          :aria-pressed="selectedPerson.id === person.id"
          @click="selectedId = person.id"
        >
          <span class="poi-category">
            {{ person.affiliation }}
          </span>

          <strong>
            {{ person.title }} {{ person.name }}
          </strong>

          <span class="poi-subtitle">
            {{ person.role }}
          </span>
          <span v-if="person.hidden" class="briefing-visibility">Hidden from players</span>
        </button>
      </div>
    </section>

    <!-- Right: Selected Character Profile -->
    <section class="poi-panel poi-record">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/portrait.svg" />
        <h1>PERSONNEL RECORD</h1>
      </div>

      <div v-if="selectedPerson" class="poi-panel-body">
        <div class="poi-identity">

          <img
            class="poi-portrait"
            :src="selectedPortrait"
            :alt="selectedPerson.name"
            @error="onImageError"
          />

          <div class="poi-identification">
            <span class="poi-category">
              UNION PERSONNEL DATABASE
            </span>

            <h2>
              {{ selectedPerson.title }}
              {{ selectedPerson.name }}
            </h2>

            <p class="poi-subtitle">
              {{ selectedPerson.pronouns }}
            </p>

            <div v-if="editable" class="briefing-edit-actions poi-record-actions">
              <button type="button" @click="$emit('edit-content', 'pois', selectedPerson)">Edit POI</button>
              <template v-if="artwork?.editable">
                <button type="button" :disabled="artwork.busy" @click="artwork.change(selectedPerson.id)">Change portrait</button>
                <button v-if="artwork.portraits[selectedPerson.id]" type="button" :disabled="artwork.busy"
                  @click="artwork.change(selectedPerson.id, true)">Use default portrait</button>
                <p v-if="artwork.error?.poiId === selectedPerson.id" class="briefing-action-error" role="alert">
                  {{ artwork.error.message }}
                </p>
              </template>
            </div>

            <div class="poi-fields">
              <p v-if="selectedPerson.affiliation">
                <strong>AFFILIATION:</strong>
                {{ selectedPerson.affiliation }}
              </p>

              <p v-if="selectedPerson.assignment">
                <strong>ASSIGNMENT:</strong>
                {{ selectedPerson.assignment }}
              </p>

              <p v-if="selectedPerson.role">
                <strong>ROLE:</strong>
                {{ selectedPerson.role }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="selectedPerson.summary || selectedPerson.details?.length" class="poi-biography">
          <template v-if="selectedPerson.summary">
            <h3>PERSONNEL OVERVIEW</h3>
            <p>{{ selectedPerson.summary }}</p>
          </template>

          <h3 v-if="selectedPerson.details?.length">BACKGROUND</h3>
          <p
            v-for="(paragraph, index) in selectedPerson.details"
            :key="index"
          >
            {{ paragraph }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { publicAssetUrl } from "@/utils/publicAssetUrl.js";

const fallbackPortrait = "/icons/npc.svg";

export default {
  name: "PersonsView",
  emits: ["edit-content"],
  props: {
    persons: { type: Array, required: true },
    editable: { type: Boolean, default: false },
    artwork: { type: Object, default: null },
  },

  data() {
    return {
      selectedId: null
    };
  },

  computed: {
    selectedPerson() {
      return this.persons.find(person => person.id === this.selectedId) ?? this.persons[0];
    },
    selectedPortrait() {
      return this.artwork?.portraits[this.selectedPerson.id]
        ?? publicAssetUrl(this.selectedPerson.portrait || fallbackPortrait);
    }
  },

  methods: {
    onImageError(event) {
      if (!event.target.src.endsWith(fallbackPortrait)) {
        event.target.src = publicAssetUrl(fallbackPortrait);
      }
    }
  }
};
</script>

<style scoped>
.poi-page {
  display: grid;
  grid-template-columns: 350px minmax(0, 1fr);
  gap: 25px;
  width: calc(100vw - 155px);
  max-width: 1600px;
  height: calc(var(--briefing-view-height) - 60px);
  margin: 30px;
  color: white;
}

.poi-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.poi-panel-body {
  background: var(--secondary-color);
  border: 1px solid var(--primary-color);
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.poi-entry {
  display: block;
  width: 100%;
  padding: 18px;
  margin-bottom: 12px;
  background: #252b2c;
  border: 1px solid #444;
  color: white;
  text-align: left;
  cursor: pointer;
}

.poi-entry:hover,
.poi-entry.selected {
  border-color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 12%, var(--briefing-panel));
}

.poi-entry strong {
  display: block;
  font-size: 18px;
  text-transform: uppercase;
  margin: 7px 0;
}

.poi-category {
  color: var(--primary-color);
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.poi-subtitle {
  color: #aaa;
  font-size: 13px;
  text-transform: uppercase;
}

.poi-identity {
  display: flex;
  gap: 25px;
  padding-bottom: 25px;
  border-bottom: 1px solid var(--primary-color);
}

.poi-portrait {
  width: 230px;
  height: 270px;
  object-fit: cover;
  background: #222;
  border: 2px solid var(--primary-color);
  flex-shrink: 0;
}

.poi-identification h2 {
  font-family: "Big Shoulders Display", sans-serif;
  font-size: 38px;
  text-transform: uppercase;
  margin: 12px 0;
}

.poi-fields {
  margin-top: 25px;
  line-height: 1.9;
}

.poi-directory-actions {
  padding: 0;
  margin-bottom: 1rem;
}

.poi-record-actions {
  padding-left: 0;
}

.poi-entry .briefing-visibility {
  display: block;
}

.poi-fields strong {
  color: var(--primary-color);
}

.poi-biography {
  padding-top: 15px;
  font-family: "Roboto", sans-serif;
  line-height: 1.7;
}

.poi-biography h3 {
  color: var(--primary-color);
  font-family: "Big Shoulders Display", sans-serif;
  font-size: 24px;
  margin: 22px 0 10px;
}

.poi-biography p {
  margin-bottom: 15px;
  color: #ddd;
}

@media (max-width: 1000px) {
  .poi-page {
    grid-template-columns: 1fr;
    height: auto;
  }

  .poi-identity {
    flex-wrap: wrap;
  }
}

/* ========================================
   UNION NAVY - POI TYPOGRAPHY
   Match existing Lancer Briefings styles
   ======================================== */

/* Default text and buttons */
.poi-page,
.poi-page button {
  font-family: "Roboto", sans-serif;
}

/* Directory affiliation labels */
.poi-category {
  font-family: "Roboto", sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--primary-color);
}

/* Directory character names */
.poi-entry strong {
  display: block;
  font-family: "Titillium Web", sans-serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1.5;
  text-transform: uppercase;
  color: white;
}

/* Secondary labels */
.poi-subtitle {
  font-family: "Roboto", sans-serif;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 2px;
  line-height: 1.5;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.67);
}

/* Large character name on record */
.poi-identification h2 {
  font-family: "Big Shoulders Display", sans-serif;
  font-size: 38px;
  font-weight: 800;
  letter-spacing: 1.5px;
  line-height: 1.2;
  text-transform: uppercase;
  color: white;
}

/* Affiliation, assignment, role */
.poi-fields,
.poi-fields p {
  font-family: "Roboto", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.87);
}

.poi-fields strong {
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  color: var(--primary-color);
}

/* Personnel overview and biography */
.poi-biography,
.poi-biography p {
  font-family: "Roboto", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.87);
}

/* Biography section headings */
.poi-biography h3 {
  font-family: "Big Shoulders Display", sans-serif;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--primary-color);
}

/* Match existing black-on-red panel headers */
.poi-page .section-header h1 {
  font-family: "Big Shoulders Display", sans-serif;
  font-weight: 800;
  color: var(--text-headers);
}

</style>
