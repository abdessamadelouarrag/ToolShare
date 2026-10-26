import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  Utilisateur, Magasin, Materiel, Reservation, Mouvement, Installation,
} from '../src/models/index.js';

const id = () => new mongoose.Types.ObjectId();
const future = () => new Date(Date.now() + 60 * 60 * 1000);

function reservation(overrides = {}) {
  return new Reservation({
    utilisateurId: id(), magasinId: id(), materielId: id(),
    dateDebut: future(), dureeHeures: 1.5,
    ...overrides,
  });
}

function utilisateur(overrides = {}) {
  return new Utilisateur({
    nom: 'Amrani', prenom: 'Sara', email: ' Sara@Example.com ',
    motDePasseHash: 'hash-provided-by-account-service', ...overrides,
  });
}

async function invalid(document, field) {
  await assert.rejects(document.validate(), (error) => {
    assert.equal(error.name, 'ValidationError');
    assert.ok(error.errors[field], `Expected a validation error for ${field}`);
    return true;
  });
}

test('accounts normalize emails, default to Utilisateur and hide password hashes', async () => {
  const account = utilisateur();
  await account.validate();
  assert.equal(account.email, 'sara@example.com');
  assert.equal(account.role, 'UTILISATEUR');
  assert.equal(account.actif, true);
  assert.equal(Utilisateur.schema.path('motDePasseHash').options.select, false);
  assert.equal(account.toJSON().motDePasseHash, undefined);
  await invalid(utilisateur({ email: 'invalid' }), 'email');
  await invalid(utilisateur({ role: 'SUPERADMIN' }), 'role');
});

test('managers require a store; an initial Admin does not require a creator', async () => {
  await invalid(utilisateur({ role: 'GESTIONNAIRE' }), 'magasinId');
  await utilisateur({ role: 'GESTIONNAIRE', magasinId: id() }).validate();
  await utilisateur({ role: 'ADMIN' }).validate();
});

test('stores and physical equipment require their identifying fields', async () => {
  const store = new Magasin({ nom: 'Magasin central', site: 'Safi', adresse: 'Site industriel' });
  await store.validate();
  assert.equal(store.actif, true);
  await invalid(new Magasin({ nom: '   ', site: 'Safi', adresse: 'Site industriel' }), 'nom');
  const equipment = new Materiel({
    reference: 'PER-001', nom: 'Perceuse', categorie: 'Percage', magasinId: id(),
  });
  await equipment.validate();
  assert.equal(equipment.disponible, true);
  assert.equal(equipment.actif, true);
  equipment.magasinId = null;
  await invalid(equipment, 'magasinId');
});

test('reservation end dates are derived from the start and fractional hours', async () => {
  const booking = reservation({ dateFin: new Date('2000-01-01') });
  await booking.validate();
  assert.equal(booking.dateFin.getTime() - booking.dateDebut.getTime(), 90 * 60 * 1000);
  assert.equal(booking.statut, 'CONFIRMEE');
  booking.dureeHeures = 2;
  await booking.validate();
  assert.equal(booking.dateFin.getTime() - booking.dateDebut.getTime(), 120 * 60 * 1000);
});

test('reservation durations must be finite and strictly positive', async () => {
  for (const dureeHeures of [0, -1, Infinity, NaN]) {
    await invalid(reservation({ dureeHeures }), 'dureeHeures');
  }
});

test('past starts are rejected for new reservations but historical loans can be returned', async () => {
  const dateDebut = new Date(Date.now() - 3 * 60 * 60 * 1000);
  await invalid(reservation({ dateDebut }), 'dateDebut');
  const historical = Reservation.hydrate({
    ...reservation().toObject(), dateDebut, statut: 'TERMINEE',
    dateSortieReelle: dateDebut, dateRetourReelle: new Date(), etatRetour: 'BON',
  });
  await historical.validate();
});

test('a loan requires a handover; a completed loan requires a return and its condition', async () => {
  await invalid(reservation({ statut: 'EN_COURS' }), 'dateSortieReelle');
  await invalid(reservation({ statut: 'TERMINEE', dateSortieReelle: new Date() }), 'dateRetourReelle');
  await invalid(reservation({
    statut: 'TERMINEE', dateSortieReelle: new Date(), dateRetourReelle: new Date(),
  }), 'etatRetour');
  await reservation({
    statut: 'TERMINEE', dateSortieReelle: new Date(), dateRetourReelle: new Date(), etatRetour: 'ENDOMMAGE',
  }).validate();
});

test('return dates must follow handover and completed status', async () => {
  await invalid(reservation({
    statut: 'TERMINEE', dateSortieReelle: future(), dateRetourReelle: new Date(), etatRetour: 'BON',
  }), 'dateRetourReelle');
  await invalid(reservation({ dateSortieReelle: new Date() }), 'dateSortieReelle');
  await invalid(reservation({ dateRetourReelle: new Date() }), 'dateRetourReelle');
});

test('overdue status applies only to outstanding loans after the expected end', () => {
  const booking = Reservation.hydrate({
    ...reservation().toObject(), statut: 'EN_COURS',
    dateFin: new Date(Date.now() - 1000), dateSortieReelle: new Date(Date.now() - 2000),
  });
  assert.equal(booking.enRetard, true);
  booking.dateFin = future();
  assert.equal(booking.enRetard, false);
  booking.dateFin = new Date(Date.now() - 1000);
  booking.dateRetourReelle = new Date();
  booking.statut = 'TERMINEE';
  assert.equal(booking.enRetard, false);
});

test('movement history requires an actor and a condition when returning equipment', async () => {
  const movement = new Mouvement({
    reservationId: id(), magasinId: id(), type: 'RETOUR', effectuePar: id(),
  });
  await invalid(movement, 'etat');
  movement.etat = 'BON';
  await movement.validate();
  movement.type = 'OTHER';
  await invalid(movement, 'type');
  movement.type = 'SORTIE';
  movement.effectuePar = null;
  await invalid(movement, 'effectuePar');
});

test('installation uses a fixed key and requires a date once installed', async () => {
  const installation = new Installation();
  await installation.validate();
  assert.equal(installation._id, 'installation');
  installation.installe = true;
  await invalid(installation, 'installeLe');
  installation.installeLe = new Date();
  await installation.validate();
  await invalid(new Installation({ _id: 'another-installation' }), '_id');
});
