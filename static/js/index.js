import {
    Component,
    Styled,
    StyledComponent,
    Record,
    StoreOf,
    Router,
    jdom,
} from 'torus-dom';

import * as L from 'leaflet';

import {SOUNDS_LIST} from './sounds.js';

class Sound extends Record { }

class SoundStore extends StoreOf(Sound) { }

//> Not sure if it's a great idea to have this as a global yet, but it might be ok
//  since this whole app is quite small. Passing this prop thru the component tree
//  might be more of a hassle.
const soundStore = new SoundStore();
for (const [slug, props] of Object.entries(SOUNDS_LIST)) {
    soundStore.create(slug, props);
}

//> `Map` is a reserved word (not really, but it's a standard library class),
//  so we use `LeafletMap`, which is also more descriptive.
class LeafletMap extends StyledComponent {

    init() {
        this.mapContainer = document.createElement('div');
        this.mapContainer.classList.add('map-container');
        this.leafletMap = new L.map(this.mapContainer).setView([51.505, -0.09], 13);

        // leaflet test code
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.leafletMap);

        for (const sound of soundStore) {
            L.marker([sound.get('lat'), sound.get('lng')]).addTo(this.leafletMap)
                .on('click', () => router.go(`/sounds/${sound.id}`));
        }

        //> This is a bad, temporary measure to invalidate the size of the rendered map on the page
        //  after Torus renders it. We'll have a better solution later.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.leafletMap.invalidateSize();
            });
        });
    }

    styles() {
        return css`
        height: 100%;
        width: 100%;
        .map-container {
            height: 100%;
            width: 100%;
        }
        `;
    }

    compose() {
        return jdom`<div class="leaflet-map-container">
            ${this.mapContainer}
        </div>`;
    }

}

class PlacePanel extends Styled(Component.from(sound => {
    const props = sound.summarize();
    return jdom`<div class="placePanel">
        <h2>${props.name}</h2>
        <p class="datetime">${props.date.toLocaleString()}</p>
        <p>${props.description}</p>
        <div class="videoPlayer">
            <iframe src="https://www.youtube.com/embed/${props.youtubeID}" frameborder="0"></iframe>
        </div>
    </div>`;
})) {

    styles() {
        return css`
        position: fixed;
        `;
    }

}

//> In the future, we may add a "list" tab where all the places
//  are enumerated in a collection view instead of on a map. So
//  this is called `MapTab`. This also keeps track of the active
//  location.
class MapTab extends StyledComponent {

    init() {
        this.activeSound = null;

        this.map = new LeafletMap();
        this.placePanel = null;
    }

    setActiveSound(slug) {
        if (slug !== null) {
            this.activeSound = soundStore.find(slug);
            this.placePanel = new PlacePanel(this.activeSound).node;
        } else {
            this.activeSound = null;
            this.placePanel = null;
        }
        this.render();
    }

    styles() {
        return css`
        height: 100%;
        width: 100%;
        .map-container {
            height: 100%;
            width: 100%;
        }
        `;
    }

    compose() {
        return jdom`<div class="mapTab">
            <div class="map-container">
                ${this.map.node}
            </div>
            ${this.placePanel}
        </div>`;
    }

}

class App extends StyledComponent {

    init(router) {
        this.mapTab = new MapTab();

        this.bind(router, ([name, params]) => {
            switch (name) {
                case 'sound':
                    this.setActiveSound(params.slug);
                    break;
                default:
                    // render home
                    break;
            }
        });
    }

    setActiveSound(slug) {
        this.mapTab.setActiveSound(slug);
    }

    styles() {
        return css`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100vh;
        width: 100vw;

        font-family: system-ui, sans-serif;

        header {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
            height: 50px;
        }
        .tabContainer {
            flex-shrink: 1;
            flex-grow: 1;
            height: 0;
        }
        `;
    }

    compose() {
        return jdom`<main>
            <header>
                <div class="logo">
                    <a href="/">Sounds</a>
                </div>
                <nav>
                    About SFP
                </nav>
            </header>
            <div class="tabContainer">
                ${this.mapTab.node}
            </div>
        </main>`;
    }

}

const router = new Router({
    sound: '/sounds/:slug',
    default: '/',
});
const app = new App(router);
document.body.appendChild(app.node);
