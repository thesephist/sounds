import {
    StyledComponent,
    Record,
    StoreOf,
    Router,
    jdom,
} from 'torus-dom';

import * as L from 'leaflet';

import SOUNDS_LIST from './sounds.js';

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
        L.marker([51.5, -0.09]).addTo(this.leafletMap)
            .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
            .openPopup();

        //> This is a bad, temporary measure to invalidate the size of the rendered map on the page
        //  after Torus renders it. We'll have a better solution later.
        setTimeout(() => {
            this.leafletMap.invalidateSize();
        }, 2000);
    }

    styles() {
        return {
            '.map-container': {
                height: '500px',
                width: '500px',
            },
        }
    }

    compose() {
        return jdom`<div class="leaflet-map-container">
            ${this.mapContainer}
        </div>`;
    }

}

const SoundYoutubeVideo = sound => {
    return jdom`<iframe src="https://www.youtube.com/embed/${sound.get('youtubeID')}"></iframe>`;
}

class PlacePanel extends StyledComponent {

    compose(props) {
        if (this.record === null) {
            return null;
        }

        return jdom`<div class="placePanel">
            <h2>${props.name}</h2>
            <p class="datetime">${props.date.toLocaleString()}</p>
            <p>${props.description}</p>
            <div class="videoPlayer">${SoundYoutubeVideo(this.record)}</div>
        </div>`;
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
        this.placePanel = new PlacePanel();
    }

    setActiveSound(slug) {
        if (slug !== null) {
            this.activeSound = soundStore.get(slug);
            this.placePanel.bind(this.activeSound);
        } else {
            ths.activeSound = null;
            this.placePanel.unbind();
        }
        this.render();
    }

    compose() {
        return jdom`<div class="mapTab">
            <div class="map-container">
                ${this.map.node}
            </div>
            ${this.placePanel.node}
        </div>`;
    }

}

class App extends StyledComponent {

    init(router) {
        this.mapTab = new MapTab();

        this.bind(router, ([name, params]) => {
            switch (name) {
                case 'sound':
                    // render specific sound
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

    compose() {
        return jdom`<main>
            Sounds!
            ${this.mapTab.node}
        </main>`;
    }

}

const router = new Router({
    sound: '/sounds/:slug',
    default: '/',
});
const app = new App(router);
document.body.appendChild(app.node);
