
import type { UserProfile } from '../src/types';
import { MOCK_USERS } from '../constants';

// type PresenceCallback = (presentUsers: UserProfile[]) => void;
// type BroadcastCallback = (payload: any) => void;

// Simple EventEmitter
class EventEmitter {
  private listeners: { [event: string]: ((...args: any[]) => void)[] } = {};

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(...args));
    }
  }

  off(event: string, callback: (...args: any[]) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
}

// Simulates a Supabase Realtime Channel
export class MockRealtimeChannel extends EventEmitter {
  channelId: string;
  presentUsers: UserProfile[] = [];
  
  // Simulate another user joining/leaving for demonstration
  private simulationInterval: number | null = null;
  private otherUsers = MOCK_USERS.slice(1);

  constructor(id: string) {
    super();
    this.channelId = id;
  }

  subscribe(user: UserProfile) {
    if (!this.presentUsers.find(u => u.id === user.id)) {
      this.presentUsers.push(user);
    }
    this.emit('presence', this.presentUsers);
    this.startSimulation();
  }

  unsubscribe(user: UserProfile) {
    this.presentUsers = this.presentUsers.filter(u => u.id !== user.id);
    this.emit('presence', this.presentUsers);
    this.stopSimulation();
  }
  
  send(payload: any) {
    // In a real scenario, this sends to Supabase. Here we just loop back.
    if (payload.event === 'contentUpdate') {
      // Simulate another client sending the message
      setTimeout(() => this.emit('broadcast', payload.payload), 50);
    }
  }

  private startSimulation() {
    if (this.simulationInterval) return;
    
    // Simulate another user joining after a delay
    setTimeout(() => {
        if(this.otherUsers.length > 0) {
            this.presentUsers.push(this.otherUsers[0]);
            this.emit('presence', this.presentUsers);
        }
    }, 2000);

    // Simulate a third user joining and leaving
    this.simulationInterval = window.setInterval(() => {
        const thirdUser = this.otherUsers[1];
        if (this.presentUsers.find(u => u.id === thirdUser.id)) {
            this.presentUsers = this.presentUsers.filter(u => u.id !== thirdUser.id);
        } else {
            this.presentUsers.push(thirdUser);
        }
        this.emit('presence', this.presentUsers);
    }, 7000);
  }

  private stopSimulation() {
    if (this.simulationInterval) {
        clearInterval(this.simulationInterval);
        this.simulationInterval = null;
    }
    this.presentUsers = this.presentUsers.filter(u => this.otherUsers.every(ou => ou.id !== u.id));
  }
}

// Manages all channels
class CollaborationService {
  private channels: Map<string, MockRealtimeChannel> = new Map();

  getChannel(channelId: string): MockRealtimeChannel {
    if (!this.channels.has(channelId)) {
      this.channels.set(channelId, new MockRealtimeChannel(channelId));
    }
    return this.channels.get(channelId)!;
  }
}

export const collaborationService = new CollaborationService();
