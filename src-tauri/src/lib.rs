use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NowPlaying {
    title: String,
    artist: String,
    album: String,
    source: String,
    position_ms: i64,
    duration_ms: i64,
    playing: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LrcLibResponse {
    instrumental: bool,
    plain_lyrics: Option<String>,
    synced_lyrics: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LyricsPayload {
    instrumental: bool,
    plain_lyrics: Option<String>,
    synced_lyrics: Option<String>,
}

#[tauri::command]
async fn get_lyrics(
    title: String,
    artist: String,
    album: String,
    duration_ms: i64,
) -> Result<Option<LyricsPayload>, String> {
    let client = reqwest::Client::builder()
        .user_agent(concat!("LyricFloat/", env!("CARGO_PKG_VERSION"), " (+https://github.com/smile-plzz/LyricFloat)"))
        .build()
        .map_err(|e| e.to_string())?;

    let duration = (duration_ms.max(0) as f64 / 1000.0).round() as i64;
    let mut query = vec![
        ("track_name", title),
        ("artist_name", artist),
    ];
    if !album.trim().is_empty() {
        query.push(("album_name", album));
    }
    if duration > 0 {
        query.push(("duration", duration.to_string()));
    }

    let response = client
        .get("https://lrclib.net/api/get")
        .query(&query)
        .send()
        .await
        .map_err(|e| format!("Lyrics request failed: {e}"))?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }

    if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err("Lyrics provider rate limit reached. Try again shortly.".into());
    }

    let response = response.error_for_status().map_err(|e| e.to_string())?;
    let data: LrcLibResponse = response.json().await.map_err(|e| e.to_string())?;

    Ok(Some(LyricsPayload {
        instrumental: data.instrumental,
        plain_lyrics: data.plain_lyrics,
        synced_lyrics: data.synced_lyrics,
    }))
}

#[cfg(target_os = "windows")]
#[tauri::command]
async fn get_now_playing() -> Result<Option<NowPlaying>, String> {
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    };

    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| e.to_string())?
        .await
        .map_err(|e| e.to_string())?;

    let session = match manager.GetCurrentSession() {
        Ok(session) => session,
        Err(_) => return Ok(None),
    };

    let media = session
        .TryGetMediaPropertiesAsync()
        .map_err(|e| e.to_string())?
        .await
        .map_err(|e| e.to_string())?;

    let timeline = session.GetTimelineProperties().map_err(|e| e.to_string())?;
    let playback = session.GetPlaybackInfo().map_err(|e| e.to_string())?;

    let title = media.Title().map_err(|e| e.to_string())?.to_string();
    if title.trim().is_empty() {
        return Ok(None);
    }

    let artist = media.Artist().map_err(|e| e.to_string())?.to_string();
    let album = media.AlbumTitle().map_err(|e| e.to_string())?.to_string();
    let source = session
        .SourceAppUserModelId()
        .map(|value| value.to_string())
        .unwrap_or_default();

    let position_ms = timeline
        .Position()
        .map(|value| value.Duration / 10_000)
        .unwrap_or_default();
    let duration_ms = timeline
        .EndTime()
        .map(|value| value.Duration / 10_000)
        .unwrap_or_default();
    let playing = playback
        .PlaybackStatus()
        .map(|status| status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing)
        .unwrap_or(false);

    Ok(Some(NowPlaying {
        title,
        artist,
        album,
        source,
        position_ms,
        duration_ms,
        playing,
    }))
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
async fn get_now_playing() -> Result<Option<NowPlaying>, String> {
    Ok(None)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_now_playing, get_lyrics])
        .run(tauri::generate_context!())
        .expect("error while running LyricFloat");
}
