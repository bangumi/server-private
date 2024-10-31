import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

export function addSchemas(app: App) {
  app.addSchema(res.Error);
  app.addSchema(res.User);
  app.addSchema(res.SlimUser);
  app.addSchema(res.Friend);
  app.addSchema(res.SubjectAirtime);
  app.addSchema(res.SubjectCollection);
  app.addSchema(res.SubjectImages);
  app.addSchema(res.SubjectPlatform);
  app.addSchema(res.SubjectRating);
  app.addSchema(res.PersonImages);
  app.addSchema(res.Infobox);
  app.addSchema(res.Subject);
  app.addSchema(res.SlimSubject);
  app.addSchema(res.Episode);
  app.addSchema(res.Character);
  app.addSchema(res.SlimCharacter);
  app.addSchema(res.Person);
  app.addSchema(res.SlimPerson);
  app.addSchema(res.Index);
  app.addSchema(res.SlimIndex);
}
