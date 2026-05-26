import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db } from '../firebase';

import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  runTransaction
} from 'firebase/firestore';

import {
  getFunctions,
  httpsCallable
} from 'firebase/functions';

import {
  ArrowLeft,
  Zap,
  Truck,
  Loader2,
  CheckCircle,
  MapPin,
  AlertTriangle,
  Radar,
  Sparkles,
  User,
  Package,
  CalendarDays
} from 'lucide-react';

import MapaCliente from '../components/MapaCliente';
import ChatFrete from '../components/ChatFrete';

import ClientToast from '../components/client/ClientToast';
import ClientCancelModal from '../components/client/ClientCancelModal';
import ClientStatusCard from '../components/client/ClientStatusCard';
import ClientDriverCard from '../components/client/ClientDriverCard';

import {
  AppTripState,
  isFinalState,
  isActiveState
} from '../state/tripStateMachine';

import { executeDispatch } from '../services/orchestrator';
