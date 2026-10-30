import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, UserAuthSummary, Entity, Company } from '../services/api';

interface AuthContextType {
  user: UserAuthSummary | null;
  activeEntity: Entity | null;
  entities: Entity[];
  companies: Company[];
  isLoading: boolean;
  login: (email: string, password: string, entityId?: number | string) => Promise<void>;
  setSession: (token: string, user: UserAuthSummary) => Promise<void>;
  logout: () => void;
  switchEntity: (entityId: number | string) => void;
  updateUser: (updated: Partial<UserAuthSummary> | UserAuthSummary) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function findEntityMatch(list: Entity[], targetId?: number | string | null): Entity | null {
  if (!list || list.length === 0) return null;
  if (!targetId) return list[0] || null;
  const targetStr = String(targetId);
  return (
    list.find(e => {
      const idVal = e.id != null ? String(e.id) : (e as any)._id != null ? String((e as any)._id) : '';
      return idVal === targetStr;
    }) ||
    list[0] ||
    null
  );
}

function saveActiveEntityId(entity: Entity | null) {
  if (!entity) return;
  const idVal = entity.id != null ? String(entity.id) : (entity as any)._id != null ? String((entity as any)._id) : '';
  if (idVal) {
    localStorage.setItem('ricozbooks_active_entity_id', idVal);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAuthSummary | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeEntity, setActiveEntity] = useState<Entity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from localStorage and verify with backend
  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('ricozbooks_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const [me, userEntities, compList] = await Promise.all([
          api.getMe(),
          api.getEntities(),
          api.getCompanies(),
        ]);

        setUser(me);
        setEntities(userEntities);
        setCompanies(compList);

        // Set active entity safely
        const savedEntityId = localStorage.getItem('ricozbooks_active_entity_id');
        const targetId = savedEntityId || me.active_entity_id || me.default_entity_id;
        const match = findEntityMatch(userEntities, targetId);
        setActiveEntity(match);
        saveActiveEntityId(match);
      } catch (err) {
        console.error('Session verification failed:', err);
        localStorage.removeItem('ricozbooks_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email: string, password: string, entityId?: number | string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password, entity_id: entityId });
      localStorage.setItem('ricozbooks_token', res.access_token);
      setUser(res.user);

      // Load entities & companies
      const [userEntities, compList] = await Promise.all([
        api.getEntities(),
        api.getCompanies(),
      ]);
      setEntities(userEntities);
      setCompanies(compList);

      const targetId = entityId || res.user.active_entity_id || res.user.default_entity_id;
      const match = findEntityMatch(userEntities, targetId);
      setActiveEntity(match);
      saveActiveEntityId(match);
    } finally {
      setIsLoading(false);
    }
  };

  const setSession = async (token: string, userSummary: UserAuthSummary) => {
    setIsLoading(true);
    try {
      localStorage.setItem('ricozbooks_token', token);
      setUser(userSummary);

      let userEntities: Entity[] = [];
      let compList: Company[] = [];

      try {
        const [fetchedEntities, fetchedCompanies] = await Promise.all([
          api.getEntities(),
          api.getCompanies(),
        ]);
        userEntities = fetchedEntities || [];
        compList = fetchedCompanies || [];
      } catch (fetchErr) {
        console.warn('Could not fetch entities or companies during setSession:', fetchErr);
      }

      setEntities(userEntities);
      setCompanies(compList);

      const targetId = userSummary.active_entity_id || userSummary.default_entity_id;
      const match = findEntityMatch(userEntities, targetId);
      setActiveEntity(match);
      saveActiveEntityId(match);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('ricozbooks_token');
    localStorage.removeItem('ricozbooks_active_entity_id');
    setUser(null);
    setActiveEntity(null);
    setEntities([]);
  };

  const switchEntity = (entityId: number | string) => {
    const match = findEntityMatch(entities, entityId);
    if (match) {
      setActiveEntity(match);
      saveActiveEntityId(match);
    }
  };

  const updateUser = (updated: Partial<UserAuthSummary> | UserAuthSummary) => {
    setUser(prev => (prev ? { ...prev, ...updated } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeEntity,
        entities,
        companies,
        isLoading,
        login,
        setSession,
        logout,
        switchEntity,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
