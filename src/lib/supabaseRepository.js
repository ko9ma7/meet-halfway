import { APP_CONFIG } from '../config.js';

function mapSnapshot(data) {
  return {
    meeting: {
      id: data.meeting.id,
      shareId: data.meeting.share_id,
      title: data.meeting.title,
      deadline: data.meeting.deadline,
      status: data.meeting.status,
      createdAt: data.meeting.created_at
    },
    participants: (data.participants || []).map((participant) => ({
      id: participant.id,
      name: participant.name,
      address: participant.address,
      lat: participant.latitude,
      lng: participant.longitude,
      createdAt: participant.created_at,
      isHost: participant.is_host
    }))
  };
}

export class SupabaseMeetingRepository {
  mode = 'supabase';

  async rpc(functionName, payload) {
    const response = await fetch(`${APP_CONFIG.supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: APP_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${APP_CONFIG.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = typeof body === 'object' && body
        ? body.message || body.details || body.hint || `Supabase 요청 오류 ${response.status}`
        : String(body || `Supabase 요청 오류 ${response.status}`);
      throw new Error(message);
    }
    return body;
  }

  async createMeeting(input) {
    const data = await this.rpc('create_meeting', {
      p_title: input.title,
      p_creator_name: input.creatorName,
      p_creator_address: input.creatorAddress,
      p_latitude: input.lat,
      p_longitude: input.lng,
      p_deadline: input.deadline,
      p_admin_token: input.adminToken,
      p_participant_token: input.participantToken
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.share_id) throw new Error('모임 링크를 만들지 못했습니다.');
    return { shareId: row.share_id };
  }

  async getMeeting(shareId) {
    const data = await this.rpc('get_meeting', { p_share_id: shareId });
    if (!data) return null;
    return mapSnapshot(data);
  }

  async addParticipant(input) {
    const data = await this.rpc('upsert_participant', {
      p_share_id: input.shareId,
      p_name: input.name,
      p_address: input.address,
      p_latitude: input.lat,
      p_longitude: input.lng,
      p_participant_token: input.participantToken
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('참가자 정보를 저장하지 못했습니다.');
    return {
      id: String(row.id),
      name: String(row.name),
      address: String(row.address),
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      createdAt: String(row.created_at)
    };
  }

  async closeMeeting(shareId, adminToken) {
    await this.rpc('close_meeting', {
      p_share_id: shareId,
      p_admin_token: adminToken
    });
  }
}
