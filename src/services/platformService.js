import Platform from '../models/Platform.js';

export const getPlatforms = async () => {
  return await Platform.find({});
};

export const createPlatform = async (platformData) => {
  const { name, commission_percentage } = platformData;
  return await Platform.create({ name, commission_percentage });
};

export const updatePlatform = async (id, updateFields) => {
  const platform = await Platform.findById(id);
  if (!platform) return null;

  platform.name = updateFields.name || platform.name;
  platform.commission_percentage = updateFields.commission_percentage !== undefined 
    ? updateFields.commission_percentage 
    : platform.commission_percentage;

  return await platform.save();
};

export const deletePlatform = async (id) => {
  const platform = await Platform.findById(id);
  if (!platform) return null;

  await platform.deleteOne();
  return true;
};
