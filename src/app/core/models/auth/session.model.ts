export interface Session {
    id_user?: string;    // facultatif pour les sessions "invité"
    id_famille?: string;
    nom_famille?: string;
    tel?: string;       // numéro utilisé pour se connecter
    expires_at: number;       // timestamp Unix ms
}
