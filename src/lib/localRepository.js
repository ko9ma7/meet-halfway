import { randomShareId } from './utils.js';
const STORAGE_KEY = 'middle-meet.local-db.v1';
function readDb() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    }
    catch {
        return {};
    }
}
function writeDb(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}
function publicSnapshot(record) {
    return {
        meeting: { ...record.snapshot.meeting },
        participants: record.snapshot.participants.map(({ participantToken: _token, ...participant }) => ({ ...participant }))
    };
}
export class LocalMeetingRepository {
    mode = 'local';
    async createMeeting(input) {
        const db = readDb();
        let shareId = randomShareId();
        while (db[shareId])
            shareId = randomShareId();
        const meetingId = crypto.randomUUID();
        const participant = {
            id: crypto.randomUUID(),
            name: input.creatorName,
            address: input.creatorAddress,
            lat: input.lat,
            lng: input.lng,
            createdAt: new Date().toISOString(),
            isHost: true,
            participantToken: input.participantToken
        };
        db[shareId] = {
            adminToken: input.adminToken,
            snapshot: {
                meeting: {
                    id: meetingId,
                    shareId,
                    title: input.title,
                    deadline: input.deadline,
                    status: 'open',
                    createdAt: new Date().toISOString()
                },
                participants: [participant]
            }
        };
        writeDb(db);
        return { shareId };
    }
    async getMeeting(shareId) {
        const record = readDb()[shareId];
        return record ? publicSnapshot(record) : null;
    }
    async addParticipant(input) {
        const db = readDb();
        const record = db[input.shareId];
        if (!record)
            throw new Error('모임을 찾을 수 없습니다.');
        if (record.snapshot.meeting.status === 'closed' || new Date(record.snapshot.meeting.deadline).getTime() <= Date.now()) {
            throw new Error('이미 입력이 마감된 모임입니다.');
        }
        const existing = record.snapshot.participants.find((p) => p.participantToken === input.participantToken);
        if (existing) {
            existing.name = input.name;
            existing.address = input.address;
            existing.lat = input.lat;
            existing.lng = input.lng;
            existing.createdAt = new Date().toISOString();
            writeDb(db);
            const { participantToken: _token, ...participant } = existing;
            return participant;
        }
        const participant = {
            id: crypto.randomUUID(),
            name: input.name,
            address: input.address,
            lat: input.lat,
            lng: input.lng,
            createdAt: new Date().toISOString(),
            participantToken: input.participantToken
        };
        record.snapshot.participants.push(participant);
        writeDb(db);
        const { participantToken: _token, ...publicParticipant } = participant;
        return publicParticipant;
    }
    async closeMeeting(shareId, adminToken) {
        const db = readDb();
        const record = db[shareId];
        if (!record)
            throw new Error('모임을 찾을 수 없습니다.');
        if (record.adminToken !== adminToken)
            throw new Error('관리 키가 올바르지 않습니다.');
        record.snapshot.meeting.status = 'closed';
        writeDb(db);
    }
}
