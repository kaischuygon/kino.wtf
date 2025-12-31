## 🍿 kino.wtf - Daily games for film buffs. 

![kino.wtf](/public/og-image.png)

### About
[kino.wtf](https://kino.wtf) is a collection of worlde-like games related to movies.

### Credits
- List of actors, movies and directors are curated IMDb lists
  - [actors list](https://www.imdb.com/list/ls4153445038/?ref_=uspf_t_3) 
  - [movies list](https://www.imdb.com/list/ls4152948888/?ref_=uspf_t_1)
  - [directors list](https://www.imdb.com/list/ls4152948412/?ref_=uspf_t_2)
- Metadata needed for each film fetched using the [TMDb API](https://developer.themoviedb.org/reference/intro/getting-started).

### Tools used
- Built using [react](https://react.dev) and [tailwindcss](https://tailwindcss.com) and [daisyui](https://daisyui.com/).
- Deployed on [vercel](https://vercel.app).

### Dev testing / advancing the clock

If you want to test how a new day's (or week's) game appears without waiting for midnight, there are two convenient approaches.

- Same-tab quick helper (recommended during development):

```javascript
// In the browser console for the each game page (development builds only)
window.__simulateNextBoundary()
```

This helper is attached in development builds and will update localStorage and dispatch a `storage` event so the page reacts immediately.
