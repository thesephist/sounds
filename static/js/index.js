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
        this.mapContainer.classList.add('map-div');
        this.leafletMap = new L.map(this.mapContainer, {
            //> We hide default zoom controls, which are in the top left
            //  which overlaps with our panel.
            zoomControl: false,
        });

        //> Create and add controls to the top right corner
        L.control.zoom({
            position: 'topright',
        }).addTo(this.leafletMap);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.leafletMap);

        for (const sound of soundStore) {
            const marker = L.marker([sound.get('lat'), sound.get('lng')]).addTo(this.leafletMap);
            marker.on('click', () => {
                router.go(`/sounds/${sound.id}`);
            });
        }

        //> This is a bad, temporary measure to invalidate the size of the rendered map on the page
        //  after Torus renders it. We'll have a better solution later.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.leafletMap.invalidateSize();
                this.centerAll();
            });
        });
    }

    centerAll() {
        const sounds = Array.from(soundStore.records);
        const lats = sounds.map(s => s.get('lat'));
        const lngs = sounds.map(s => s.get('lng'));

        const maxLat = Math.max(...lats);
        const minLat = Math.min(...lats);
        const maxLng = Math.max(...lngs);
        const minLng = Math.min(...lngs);

        const bounds = L.latLngBounds([
            [minLat, minLng],
            [maxLat, maxLng],
        ]);
        if (!this._setInitialBounds) {
            this.leafletMap.fitBounds(bounds);
            this._setInitialBounds = true;
        } else {
            this.leafletMap.flyToBounds(bounds, {
                duration: 1.8,
            });
        }
    }

    centerSound(sound) {
        this.leafletMap.flyToBounds(L.latLngBounds([{
            lat: sound.get('lat'),
            lng: sound.get('lng'),
        }]), {
            duration: 1.8,
        });
    }

    styles() {
        return css`
        height: 100%;
        width: 100%;
        .map-div {
            height: 100%;
            width: 100%;
            position: relative;
            z-index: 1;
        }
        `;
    }

    compose() {
        return jdom`<div class="leaflet-map-container">
            ${this.mapContainer}
        </div>`;
    }

}

const AudioWithControls = audioSrc => {
    // TODO: improve this with custom controls?
    return jdom`<audio src="${audioSrc}" controls></audio>`;
}

class PlacePanel extends StyledComponent {

    init() {
        this.active = false;

        this.toggleActive = this.toggleActive.bind(this);
    }

    bindSound(sound) {
        if (sound === null) {
            this.unbind();
        } else {
            this.bind(sound, () => this.render());
        }
        this.render();
    }

    styles() {
        let position;
        if (this.record === null) {
            position = '0';
        } else if (this.active) {
            position = 'calc(-100% - 8px)';
        }  else {
            position = '-20vh';
        }

        return css`
        position: absolute;
        top: 100%;
        left: 50%;
        background: #fff;
        border-radius: 6px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, .4);
        z-index: 100;
        padding: 12px 20px;
        transform: translate(-50%, ${position});
        transition: transform .3s;
        cursor: pointer;
        box-sizing: border-box;
        width: 96%;

        @media only screen and (min-width: 700px) {
            /* the !importants are dirty -- they'll be unnecessary in torus v0.4.4+ */
            transform: none !important;
            top: 8px !important;
            left: 8px !important;
            width: 340px !important;
            display: ${this.record === null ? 'none' : 'block'}
        }

        button {
            position: absolute;
            top: 12px;
            right: 12px;
            padding: 4px 6px;
            font-size: 1em;
            border: 0;
            box-shadow: 0;
            border-radius: 0;
            color: #000;
            cursor: pointer;

            &:hover {
                background: #ddd;
            }
        }
        `;
    }

    toggleActive() {
        this.active = !this.active;
        this.render();
    }

    compose(props) {
        let content = null;
        if (this.record !== null) {
            content = jdom`<div>
                <h2>${props.name}</h2>
                <button onclick="${() => router.go('/')}">Close</button>
                <p class="datetime">${props.date.toLocaleString()}</p>
                <p>${props.description}</p>
                ${AudioWithControls(`/static/mp3/${props.id}.mp3`)}
            </div>`;
        }

        return jdom`<div class="placePanel" onclick="${this.toggleActive}">
            ${content}
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
            this.activeSound = soundStore.find(slug);
            this.map.centerSound(this.activeSound);
        } else {
            this.activeSound = null;
            this.map.centerAll();
        }
        this.placePanel.bindSound(this.activeSound);
        this.render();
    }

    styles() {
        return css`
        height: 100%;
        width: 100%;
        position: relative;
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
            ${this.placePanel.node}
        </div>`;
    }

}

class AboutTab extends StyledComponent {

    styles() {
        return css`
        margin: 20px auto;
        max-width: 800px;
        width: 60%;
        line-height: 1.5em;

        .signout {
            text-align: right;
        }

        @media only screen and (max-width: 700px) {
            width: 92% !important;
        }
        `;
    }

    compose() {
        return jdom`<div class="aboutTab">
            <p>
                Since 2017 I've been fortunate enough to travel to a bunch of new and
                interesting places across the United States and the world.
            </p>
            <p>
                Though I love to take pictures and videos to remember where I've been,
                I discovered that one of my favorite ways to remember where I've been is
                to listen to the <strong>sounds of places</strong>.
            </p>
            <p class="signout">- Linus</p>
        </div>`;
    }

}

class App extends StyledComponent {

    init(router) {
        this.activeTab = 'map';

        this.tabs = {
            map: new MapTab(),
            about: new AboutTab(),
        }

        this.bind(router, ([name, params]) => {
            switch (name) {
                case 'sound':
                    this.setActiveSound(params.slug);
                    this.activeTab = 'map';
                    break;
                case 'about':
                    this.activeTab = 'about';
                    break;
                default:
                    this.setActiveSound(null);
                    this.activeTab = 'map';
                    break;
            }
            this.render();
        });
    }

    setActiveSound(slug) {
        this.tabs.map.setActiveSound(slug);
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
            box-sizing: border-box;
            padding-left: 16px;
            padding-right: 16px;
            border-bottom: 2px solid #333;
        }
        header a {
            color: #000;
            text-decoration: none;
            white-space: nowrap;
            &:hover {
                text-decoration: underline;
            }
        }
        .logo a {
            font-size: 32px;
            font-weight: bold;
        }
        .tabContainer {
            flex-shrink: 1;
            flex-grow: 1;
            height: 0;
        }
        nav {
            display: flex;
            flex-direction: row;
            align-items: center;
            a {
            margin-left: 12px;
            }
        }
        `;
    }

    compose() {
        return jdom`<main>
            <header>
                <div class="logo">
                    <a href="/" onclick="${evt => {
                        evt.preventDefault();
                        router.go('/');
                    }}">Sounds</a>
                </div>
                <nav>
                    <a href="https://linus.zone/now">
                        <span class="desktop">Made by </span>
                        <span class="mobile">@</span>thesephist
                    </a>
                    <a href="/about" onclick="${evt => {
                        evt.preventDefault();
                        router.go('/about');
                    }}">About</a>
                </nav>
            </header>
            <div class="tabContainer">
                ${this.tabs[this.activeTab].node}
            </div>
        </main>`;
    }

}

const router = new Router({
    sound: '/sounds/:slug',
    about: '/about',
    default: '/',
});
const app = new App(router);
document.body.appendChild(app.node);
