require('dotenv').config()
const axios = require('axios');
const fs = require('fs');

//const { performance } = require('perf_hooks');


class Spotify {
  static accessToken;

  static async getPlaylistTracks(url, onlyWithPreview = true, secondTry = false){
    const playlistId = Spotify.getPlaylistId(url);

    if(!playlistId) return {status: 400, message: "This is not a valid Spotify playlist URL"};

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
          response.data.items.forEach(item => {
            if(!onlyWithPreview || item.track.preview_url){
              tracks.push(item.track);
            }
          });
          nextUrl = response.data.next;
        }).catch(error => {
          nextUrl = false;
          throw error.response.status;
        });
      }
    }catch(err){
      if(err === 401 && !secondTry){
        console.log("refreshing");
        await Spotify.getAccessToken();
        return Spotify.getPlaylist(url, onlyWithPreview, true);
      }
    }
    
    return tracks;

  }

  static async getPlaylistInfo(url, secondTry = false){
    const playlistId = Spotify.getPlaylistId(url);

    if(!playlistId) return {status: 400, message: "This is not a valid Spotify® playlist URL"};

    if(!Spotify.accessToken) await Spotify.getAccessToken();

    const fields = "name,tracks(items(track(preview_url))),external_urls(spotify)";
    const fieldEncoded = encodeURIComponent(fields);

    try{
      return await axios({
        method: "get",
        url: `https://api.spotify.com/v1/playlists/${playlistId}?fields=${fieldEncoded}`,
        headers: {
          Authorization: `Bearer ${Spotify.accessToken}`
        }
      }).then(response => {
        let valid_songs = 0;
        let total_songs = response.data.tracks.items.length;
        response.data.tracks.items.forEach(item => {
          if(item.track.preview_url) valid_songs += 1;
        });
        return {
          status: response.status,
          info: response.status === 200 ? {
            name: response.data.name,
            href: response.data.external_urls.spotify,
            valid_songs,
            total_songs
          } : response.data
        };
      }).catch(error => {
        if(error.response.status === 401) throw 401;
        if(error.response.data && error.response.data.error){
            return error.response.data.error;
        }
        return {status: error.response}
      });
    } catch(err) {
      if(err === 401 && !secondTry){
        await Spotify.getAccessToken();
        return Spotify.getPlaylistInfo(url, true);
      }
    }
  }

  static getPlaylistId(url){
    url = url.split('?')[0].split('//');
    if(url.length < 2) return false;
    const urlParts = url[1].split('/');
    if(urlParts[1] !== 'playlist') return false;

    return urlParts[2];
  }

  static getAccessToken(secondTry = false) {
    console.log("Requesting new access token");
    return axios({
      method: "post",
      url: "https://accounts.spotify.com/api/token",
      data: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}` 
      }
    }).then(response => {
      Spotify.accessToken = response.data.access_token;
      return Spotify.accessToken;
    }).catch(error => {
      console.log("An error occurred while requesting access token");
      if(!secondTry) return Spotify.getAccessToken(true);
    });
  }
}

module.exports = Spotify;
