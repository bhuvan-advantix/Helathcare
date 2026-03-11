import { pgGenerate } from 'drizzle-dbml-generator';
import * as schema from './db/schema';

pgGenerate({ schema, out: './schema.dbml', relational: true });
