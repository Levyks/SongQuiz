require('dotenv').config()
const axios = require('axios');


const fs = require('fs');
const { performance } = require('perf_hooks');


class Spotify {
  static accessToken;

  static async getPlaylistTracks(url, secondTry = false){
    const playlistId = Spotify.getPlaylistId(url);

    if(!Spotify.accessToken) await Spotify.getAccessToken();

    const fields = "items(track(name, preview_url, external_urls, artists(external_urls,name), album(images))),next";
    const fieldEncoded = encodeURIComponent(fields);

    const tracks = [];

    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=${fieldEncoded}`;

    try{

      while(nextUrl){
        await axios({
          method: "get",
          url: nextUrl,
          headers: {
            Authorization: `Bearer ${Spotify.accessToken}`
          }
        }).then(response => {
          nextUrl = response.data.next;

          response.data.items.forEach(item => {
            //Only add tracks that have a preview url
            if(item.track.preview_url){
              tracks.push(Spotify.formatTrack(item.track));
            }
          });

        }).catch(error => {
          throw error;
        });
      }

    } catch(error) {
      return Spotify.handleErrorsInGetPlaylistMethods(error, Spotify.getPlaylistTracks, url, secondTry);  
    }
    
    return tracks;

  }

  static formatTrack(track) {
    let trackFormatted = {
      albumImageUrl: track.album.images[track.album.images.length - 1].url,
      artists: "",
      href: track.external_urls.spotify,
      name: track.name,
      preview_url: track.preview_url
    };
    
    track.artists.forEach(artist => {
      trackFormatted.artists += artist.name + ', ';
    });
    trackFormatted.artists = trackFormatted.artists.slice(0,-2)

    if(trackFormatted.artists.length > 50){
      trackFormatted.artists = trackFormatted.artists.slice(0, 50) + '...';
    }

    return trackFormatted
  }

  static async getPlaylistInfo(url, secondTry = false){
    const playlistId = Spotify.getPlaylistId(url);

    if(!Spotify.accessToken) await Spotify.getAccessToken();

    const fields = "name,external_urls(spotify)";
    const fieldEncoded = encodeURIComponent(fields);

    try {

      return await axios({
        method: "get",
        url: `https://api.spotify.com/v1/playlists/${playlistId}?fields=${fieldEncoded}`,
        headers: {
          Authorization: `Bearer ${Spotify.accessToken}`
        }
      }).then(response => {
        return {
          name: response.data.name,
          href: response.data.external_urls.spotify
        } 

      }).catch(error => {
        throw error
      });

    } catch(error) {
      return Spotify.handleErrorsInGetPlaylistMethods(error, Spotify.getPlaylistInfo, url, secondTry);  
    }
  }

  static async handleErrorsInGetPlaylistMethods(error, func, url, secondTry) {
    let refreshBeforeRetry = false;

    const errorCode = error.response && error.response.status;

    if(errorCode) {
      refreshBeforeRetry = errorCode === 401;

      Spotify.log(`${func.name} -> Error ${error.response.status}`);
        
    } else {
      Spotify.log(`${func.name} -> Unknown error`);
    }

    if(secondTry) {
      Spotify.log(`${func.name} -> This was already the second attempt, giving up`);
    } else if(errorCode === 404) {
      Spotify.log(`${func.name} -> No point in trying again, giving up`);
    } else {
      if(refreshBeforeRetry) {
        Spotify.log(`${func.name} -> Refreshing access token before retyring`);
        await Spotify.getAccessToken();
      }
      Spotify.log(`${func.name} -> Trying again`);
      return func(url, true);
    }

    throw error;
  }

  static getPlaylistId(url){
    url = url.split('?')[0].split('//');
    if(url.length < 2) throw {response: {status: 400, message: "Invalid URL"}};

    const urlParts = url[1].split('/');
    if(urlParts[1] !== 'playlist') throw {response: {status: 400, message: "This is not a valid Spotify® playlist URL"}};

    return urlParts[2];
  }

  static getAccessToken(secondTry = false) {
    Spotify.log("Requesting new access token");
    return axios({
      method: "post",
      url: "https://accounts.spotify.com/api/token",
      data: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}` 
      }
    }).then(response => {
      Spotify.accessToken = response.data.access_token;
      fs.writeFileSync('./token.json', JSON.stringify({access_token: Spotify.accessToken}));
      return Spotify.accessToken;

    }).catch(error => {
      if(error.response && error.response.status) {
        Spotify.log(`getAccessToken -> Error ${error.response.status}`);
      } else {
        Spotify.log(`getAccessToken -> Unknown error`);
      }

      if(secondTry) {
        Spotify.log("getAccessToken -> This was already the second attempt, giving up");
      } else {
        Spotify.log("getAccessToken -> Trying again");
        return Spotify.getAccessToken(true);
      }

      throw error;
    });
  }

  static log(message) {
    console.log(`[SPOTIFY] | ${new Date().toLocaleTimeString()} -> ${message}`);
  }
}

module.exports = Spotify;


Spotify.accessToken = JSON.parse(fs.readFileSync('./token.json')).access_token;

/*
const started = performance.now()
Spotify.getPlaylistTracks("https://open.spotify.com/playlist/1iDizn8CbHQtCyNSo0NZQj?si=eae87c214bd34a35").then(tracks => {
  console.log(tracks);
  const ended = performance.now()
  console.log(`Took ${ended-started} ms`);
});
*/
