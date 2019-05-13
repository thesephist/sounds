# Sounds from Places

This is an interactive map of places I've been to, and about a minute of ambient sounds from those places 🎙. For example, [here's NYC's High Line](https://soundsfromplaces.surge.sh/sounds/the-highline).

Photos and videos are great for remembering memories, but sometimes I really just want to _sink in_ to feeling like I were really there, so I've been collecting these sounds from places, so when I want to feel like I'm back home, I can just tune into the right place, wherever I am. So this is the result! You can drag around on the map, look at the list of places I've collected already, and listen to some of my favorite places / travel locations. Happy Listening!

## Development

Want to deploy your own version?

- Download your copy of the repo with `git clone http://github.com/thesephist/sounds`
- `yarn install` or `npm install` the few dependencies we have
- You can add your own sounds by adding .mp3 files to `/static/mp3` and adding new entries to `/static/js/sounds.js`
- Build a new version with `yarn build` or `npm run build`. This will give you a new static site in `./dist/` that you can deploy anywhere. I recommend [surge](https://surge.sh) and [Netlify](https://netlify.com).

If you follow the instructions above, you should be able to build your own version of sounds from places! If you run into problems, please feel free to open an issue.

