/**
 * Helper de base de datos para tests con mongodb-memory-server.
 * Cada fichero de test importa estas funciones y las usa en
 * beforeAll / afterEach / afterAll.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;

/** Arranca MongoMemoryServer y conecta mongoose. */
export const dbConnect = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

/** Limpia todos los documentos (sin cerrar la conexión). */
export const dbClear = async () => {
  const { collections } = mongoose.connection;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/** Cierra la conexión y detiene MongoMemoryServer. */
export const dbClose = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
};
