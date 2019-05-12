import * as L from 'leaflet';

import {
    Record,
    Router,
    StoreOf,
    StyledComponent,
    jdom,
} from 'torus-dom';

import {SOUNDS_LIST} from './sounds.js';

class Sound extends Record { }
class SoundStore extends StoreOf(Sound) {

    get comparator() {
        return sound => -sound.get('date').getTime();
    }

}

//> Not sure if it's a great idea to have this as a global yet, but it might be ok
//  since this whole app is quite small.
const soundStore = new SoundStore();
for (const [slug, props] of Object.entries(SOUNDS_LIST)) {
    soundStore.create(slug, props);
}

//> `Map` is a reserved word (not really, but it's a standard library class),
//  so we use `LeafletMap`, which is also more descriptive.
class LeafletMap extends StyledComponent {

    init(soundStore) {
        this.mapContainer = document.createElement('div');
        this.mapContainer.classList.add('map-div');
        this.leafletMap = new L.map(this.mapContainer, {
            //> We hide default zoom controls, which are in the top left
            //  which overlaps with our panel.
            zoomControl: false,
        });

        this.bind(soundStore, () => this.render());

        //> Create and add controls to the top right corner
        L.control.zoom({
            position: 'topright',
        }).addTo(this.leafletMap);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.leafletMap);

        for (const sound of soundStore) {
            const marker = L.marker([sound.get('lat'), sound.get('lng')]).addTo(this.leafletMap);
            marker.on('click', () => {
                router.go(`/sounds/${sound.id}`);
            });
        }
    }

    resize() {
        this.leafletMap.invalidateSize();
    }

    flyOptions() {
        return {
            duration: 1.8,
        }
    }

    centerAll(fly) {
        const sounds = Array.from(this.record.records);
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
        this.goToBounds(bounds, fly);
    }

    centerSound(sound, fly) {
        const bounds = L.latLngBounds([{
            lat: sound.get('lat'),
            lng: sound.get('lng'),
        }]);
        this.goToBounds(bounds, fly);
    }

    goToBounds(bounds, fly) {
        if (!this._setInitialBounds || fly !== true) {
            this.leafletMap.fitBounds(bounds);
            this._setInitialBounds = true;
        } else {
            this.leafletMap.flyToBounds(bounds, this.flyOptions());
        }
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
    return jdom`<div class="audioGroup">
        <audio src="${audioSrc}" controls loop>
            <div class="audioLink">Listen to the sound <a href="${audioSrc}">here</a>.</div>
        </audio>
    </div>`;
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
        this.active = false;
        this.render();
    }

    styles() {
        let position;
        if (this.record === null) {
            position = '102%';
        } else if (this.active) {
            position = '-16px';
        } else {
            position = 'calc(100% - 150px)';
        }

        return css`
        position: absolute;
        left: 50%;
        bottom: 0;
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
            transform: none;
            top: 8px;
            left: 8px;
            bottom: unset;
            width: 340px;
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
            color: #777;
            cursor: pointer;
            background: #fff;

            &:hover {
                background: #dfdfdf;
            }
        }
        h2 {
            margin-top: 30px;
            margin-bottom: 16px;
        }
        .datetime {
            margin-top: 0;
            color: #777;
        }
        .description {
            margin: 24px 0;
            line-height: 1.4em;
        }
        audio {
            width: 100%;
            margin-bottom: 12px;
        }
        .audioLink {
            color: #999;
            font-size: .8em;
            a {
                color: #777;
            }
        }
        .tapHint {
            color: #777;
            position: absolute;
            top: 12px;
            left: 0;
            right: 0;
            width: 100%;
            font-style: italic;
            text-align: center;
            transition: opacity .3s;
        }
        `;
    }

    toggleActive(evt) {
        evt.preventDefault();
        this.active = !this.active;
        this.render();
    }

    compose(props) {
        let content = null;
        if (this.record !== null) {
            content = jdom`<div>
                <div class="tapHint mobile" style="opacity:${this.active ? 0 : 1}">Tap to see more</div>
                <button onclick="${() => router.go('/')}">Close</button>
                <h2>${props.name}</h2>
                <p class="datetime">Recorded ${props.date.toLocaleDateString()}</p>
                <p class="description">${props.description}</p>
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

    init(soundStore) {
        this.activeSound = null;

        this.map = new LeafletMap(soundStore);
        this.placePanel = new PlacePanel();
    }

    setActiveSound(slug, fly) {
        if (slug !== null) {
            this.activeSound = soundStore.find(slug);
        } else {
            this.activeSound = null;
        }
        this.placePanel.bindSound(this.activeSound);
        this.render();

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.map.resize();
                if (slug !== null) {
                    this.map.centerSound(this.activeSound, fly);
                } else {
                    this.map.centerAll(fly);
                }
            });
        });
    }

    styles() {
        return css`
        height: 100%;
        width: 100%;
        position: relative;
        overflow: hidden;
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

const SoundListItem = sound => {
    const props = sound.summarize();

    return jdom`<li class="soundListItem" onclick="${() => router.go(`/sounds/${sound.id}`)}">
        <div class="soundName">${props.name}</div>
        <div class="soundDate">${props.date.toLocaleDateString()}</div>
        <div class="soundDescription">${props.description}</div>
        <div class="soundLocation">
            <span>${props.lat}</span>, <span>${props.lng}</span>
        </div>
    </li>`;
}

class SoundListTab extends StyledComponent {

    init(soundStore) {
        this.bind(soundStore, () => this.render());
    }

    styles() {
        return css`
        margin: 20px auto;
        max-width: 800px;
        width: 60%;

        @media only screen and (max-width: 700px) {
            width: 92%;
        }

        ul {
            padding-left: 0;
        }
        li {
            list-style: none;
            cursor: pointer;
            padding: 6px 10px;
            border-radius: 4px;
            margin-bottom: 6px;
            border: 1px solid #ddd;
            box-sizing: border-box;

            &:hover {
                background: #eee;
            }
        }
        .soundName {
            font-weight: bold;
        }
        .soundDate {
            color: #999;
        }
        .soundLocation {
            color: #999;
            font-size: .8em;
        }
        .soundName,
        .soundDate,
        .soundDescription {
            margin-bottom: 6px;
        }
        .soundDescription {
            line-height: 1.4em;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
        `;
    }

    compose(props) {
        return jdom`<div class="soundsListContainer">
            <ul class="soundList">
                ${props.map(s => SoundListItem(s))}
            </ul>
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
            width: 92%;
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
                to listen to the <strong>sounds from places</strong>.
            </p>
            <p>
                If you want to see other stuff I've made, I'm at <a href="https://linus.zone/now">linus.zone/now</a>
                and <a href="https://twitter.com/thesephist">@thesephist</a> elsewhere on the web.
            </p>
            <p class="signout">- Linus 🚀</p>
        </div>`;
    }

}

class App extends StyledComponent {

    init(router) {
        this.activeTab = 'map';

        this.tabs = {
            map: new MapTab(soundStore),
            about: new AboutTab(),
            list: new SoundListTab(soundStore),
        }

        this.bind(router, ([name, params]) => {
            switch (name) {
                case 'sound':
                    this.setActiveSound(params.slug, {fly: this.activeTab === 'map'});
                    this.activeTab = 'map';
                    break;
                case 'about':
                    this.activeTab = 'about';
                    break;
                case 'list':
                    this.activeTab = 'list';
                    break;
                default:
                    this.setActiveSound(null, {fly: this.activeTab === 'map'});
                    this.activeTab = 'map';
                    break;
            }
            this.render();
        });
    }

    setActiveSound(slug, {fly}) {
        this.tabs.map.setActiveSound(slug, fly);
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
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 10;
            background: #fff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, .3);

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
            font-size: 24px;
            font-weight: bold;
        }
        .tabContainer {
            flex-shrink: 1;
            flex-grow: 1;
            height: 0;
            margin-top: 50px;
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
                    }}">Sounds<span class="desktop"> from Places</span></a>
                </div>
                <nav>
                    <a href="/" onclick="${evt => {
                        evt.preventDefault();
                        router.go('/');
                    }}">Map</a>
                    <a href="/list" onclick="${evt => {
                        evt.preventDefault();
                        router.go('/list');
                    }}">List</a>
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
    list: '/list',
    default: '/',
});
const app = new App(router);
document.body.appendChild(app.node);
