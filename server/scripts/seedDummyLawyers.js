// Seeds 25 dummy lawyer accounts (User + visible Lawyer profile) for local
// development. Mirrors authController.register: one User with role 'lawyer'
// and a linked Lawyer profile. Profiles are marked verificationStatus
// 'approved' + isProfileVisible true so they appear in the public listing
// (publicLawyerController filters on both).
//
//   npm run seed:dummy-lawyers
//
// Idempotent: accounts whose email or phone already exist are skipped.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Lawyer = require('../models/lawyer');

const SEED_PASSWORD = 'CaseJeeto@123';
const COUNT = 25;

const seedLawyers = [
  {
    name: 'Arjun Mehta',
    email: 'lawyer1@example.com',
    phone: '+919000000001',
    city: 'Delhi',
    courtsPracticed: ['Delhi High Court', 'Supreme Court of India'],
    specializations: ['Criminal Law', 'Constitutional Law'],
    yearsOfExperience: 18,
    consultationFee: 2500,
    languages: ['English', 'Hindi'],
    rating: 4.8,
    reviewCount: 96,
    totalConsultations: 340,
    bio: 'Senior criminal and constitutional lawyer with 18 years of trial experience before the Delhi High Court and Supreme Court of India.',
  },
  {
    name: 'Priya Sharma',
    email: 'lawyer2@example.com',
    phone: '+919000000002',
    city: 'Mumbai',
    courtsPracticed: ['Bombay High Court'],
    specializations: ['Family Law', 'Matrimonial Law'],
    yearsOfExperience: 12,
    consultationFee: 2000,
    languages: ['English', 'Hindi', 'Marathi'],
    rating: 4.6,
    reviewCount: 74,
    totalConsultations: 260,
    bio: 'Family lawyer helping clients navigate divorce, custody, and maintenance matters with a focus on mediation and settlement.',
  },
  {
    name: 'Rohit Verma',
    email: 'lawyer3@example.com',
    phone: '+919000000003',
    city: 'Bengaluru',
    courtsPracticed: ['Karnataka High Court'],
    specializations: ['Corporate Law', 'Banking & Finance'],
    yearsOfExperience: 15,
    consultationFee: 3000,
    languages: ['English', 'Hindi', 'Kannada'],
    rating: 4.7,
    reviewCount: 58,
    totalConsultations: 195,
    bio: 'Corporate and banking lawyer advising startups and SMEs on contracts, compliance, and debt financing.',
  },
  {
    name: 'Ananya Iyer',
    email: 'lawyer4@example.com',
    phone: '+919000000004',
    city: 'Chennai',
    courtsPracticed: ['Madras High Court'],
    specializations: ['Intellectual Property', 'Corporate Law'],
    yearsOfExperience: 10,
    consultationFee: 2800,
    languages: ['English', 'Tamil'],
    rating: 4.5,
    reviewCount: 41,
    totalConsultations: 150,
    bio: 'IP lawyer specialising in trademark, copyright, and patent prosecution for creators and technology companies.',
  },
  {
    name: 'Vikram Singh',
    email: 'lawyer5@example.com',
    phone: '+919000000005',
    city: 'Jaipur',
    courtsPracticed: ['Rajasthan High Court'],
    specializations: ['Property Law', 'Real Estate'],
    yearsOfExperience: 20,
    consultationFee: 1800,
    languages: ['English', 'Hindi'],
    rating: 4.4,
    reviewCount: 88,
    totalConsultations: 410,
    bio: 'Property and real estate lawyer handling title verification, sale deeds, and land dispute litigation.',
  },
  {
    name: 'Sneha Patel',
    email: 'lawyer6@example.com',
    phone: '+919000000006',
    city: 'Ahmedabad',
    courtsPracticed: ['Gujarat High Court'],
    specializations: ['Labour Law', 'Employment Law'],
    yearsOfExperience: 11,
    consultationFee: 2200,
    languages: ['English', 'Hindi', 'Gujarati'],
    rating: 4.6,
    reviewCount: 52,
    totalConsultations: 230,
    bio: 'Labour and employment lawyer representing employees in wrongful termination, compensation, and workplace disputes.',
  },
  {
    name: 'Karan Malhotra',
    email: 'lawyer7@example.com',
    phone: '+919000000007',
    city: 'Delhi',
    courtsPracticed: ['Delhi High Court'],
    specializations: ['Tax Law', 'Corporate Law'],
    yearsOfExperience: 16,
    consultationFee: 3200,
    languages: ['English', 'Hindi'],
    rating: 4.7,
    reviewCount: 63,
    totalConsultations: 220,
    bio: 'Tax lawyer advising on direct and indirect taxes, GST disputes, and corporate structuring.',
  },
  {
    name: 'Divya Nair',
    email: 'lawyer8@example.com',
    phone: '+919000000008',
    city: 'Kochi',
    courtsPracticed: ['Kerala High Court'],
    specializations: ['Civil Law', 'Consumer Protection'],
    yearsOfExperience: 9,
    consultationFee: 1500,
    languages: ['English', 'Malayalam'],
    rating: 4.3,
    reviewCount: 34,
    totalConsultations: 180,
    bio: 'Civil and consumer lawyer handling recovery suits, contract disputes, and consumer complaints.',
  },
  {
    name: 'Rohan Gupta',
    email: 'lawyer9@example.com',
    phone: '+919000000009',
    city: 'Lucknow',
    courtsPracticed: ['Allahabad High Court'],
    specializations: ['Criminal Law'],
    yearsOfExperience: 14,
    consultationFee: 1700,
    languages: ['English', 'Hindi'],
    rating: 4.5,
    reviewCount: 71,
    totalConsultations: 300,
    bio: 'Criminal defence lawyer with expertise in bail applications, quashing petitions, and trial advocacy.',
  },
  {
    name: 'Meera Krishnan',
    email: 'lawyer10@example.com',
    phone: '+919000000010',
    city: 'Chennai',
    courtsPracticed: ['Madras High Court'],
    specializations: ['Family Law', 'Civil Law'],
    yearsOfExperience: 13,
    consultationFee: 2100,
    languages: ['English', 'Tamil', 'Hindi'],
    rating: 4.6,
    reviewCount: 49,
    totalConsultations: 205,
    bio: 'Family and civil lawyer focused on amicable resolution of matrimonial and succession disputes.',
  },
  {
    name: 'Aditya Rao',
    email: 'lawyer11@example.com',
    phone: '+919000000011',
    city: 'Hyderabad',
    courtsPracticed: ['Telangana High Court'],
    specializations: ['Cyber Law', 'Intellectual Property'],
    yearsOfExperience: 8,
    consultationFee: 2600,
    languages: ['English', 'Hindi', 'Telugu'],
    rating: 4.4,
    reviewCount: 28,
    totalConsultations: 120,
    bio: 'Cyber law and IP lawyer handling data privacy, online fraud, and digital content disputes.',
  },
  {
    name: 'Nisha Reddy',
    email: 'lawyer12@example.com',
    phone: '+919000000012',
    city: 'Hyderabad',
    courtsPracticed: ['Telangana High Court'],
    specializations: ['Property Law', 'Real Estate'],
    yearsOfExperience: 12,
    consultationFee: 1900,
    languages: ['English', 'Telugu', 'Hindi'],
    rating: 4.2,
    reviewCount: 39,
    totalConsultations: 175,
    bio: 'Real estate lawyer specialising in RERA matters, sale agreements, and property due diligence.',
  },
  {
    name: 'Sanjay Desai',
    email: 'lawyer13@example.com',
    phone: '+919000000013',
    city: 'Pune',
    courtsPracticed: ['Bombay High Court'],
    specializations: ['Corporate Law', 'Banking & Finance'],
    yearsOfExperience: 19,
    consultationFee: 3400,
    languages: ['English', 'Hindi', 'Marathi'],
    rating: 4.8,
    reviewCount: 82,
    totalConsultations: 285,
    bio: 'Senior corporate lawyer guiding founders through funding rounds, M&A, and commercial contracts.',
  },
  {
    name: 'Kavya Menon',
    email: 'lawyer14@example.com',
    phone: '+919000000014',
    city: 'Kochi',
    courtsPracticed: ['Kerala High Court'],
    specializations: ['Consumer Protection', 'Civil Law'],
    yearsOfExperience: 7,
    consultationFee: 1400,
    languages: ['English', 'Malayalam'],
    rating: 4.1,
    reviewCount: 22,
    totalConsultations: 140,
    bio: 'Consumer and civil lawyer assisting with defective goods, service deficiencies, and recovery matters.',
  },
  {
    name: 'Rahul Khanna',
    email: 'lawyer15@example.com',
    phone: '+919000000015',
    city: 'Delhi',
    courtsPracticed: ['Delhi High Court', 'Supreme Court of India'],
    specializations: ['Constitutional Law', 'Criminal Law'],
    yearsOfExperience: 22,
    consultationFee: 4000,
    languages: ['English', 'Hindi'],
    rating: 4.9,
    reviewCount: 110,
    totalConsultations: 320,
    bio: 'Constitutional lawyer arguing public interest and civil liberties matters before the highest courts.',
  },
  {
    name: 'Pooja Joshi',
    email: 'lawyer16@example.com',
    phone: '+919000000016',
    city: 'Mumbai',
    courtsPracticed: ['Bombay High Court'],
    specializations: ['Employment Law', 'Labour Law'],
    yearsOfExperience: 10,
    consultationFee: 2300,
    languages: ['English', 'Hindi', 'Marathi'],
    rating: 4.5,
    reviewCount: 44,
    totalConsultations: 190,
    bio: 'Employment lawyer advising on severance, workplace policies, and employment contracts.',
  },
  {
    name: 'Amit Saxena',
    email: 'lawyer17@example.com',
    phone: '+919000000017',
    city: 'Noida',
    courtsPracticed: ['Delhi High Court'],
    specializations: ['Cyber Law', 'Criminal Law'],
    yearsOfExperience: 9,
    consultationFee: 2400,
    languages: ['English', 'Hindi'],
    rating: 4.3,
    reviewCount: 31,
    totalConsultations: 130,
    bio: 'Cyber crime and criminal lawyer handling cyber fraud, online harassment, and digital evidence cases.',
  },
  {
    name: 'Ritu Bansal',
    email: 'lawyer18@example.com',
    phone: '+919000000018',
    city: 'Gurugram',
    courtsPracticed: ['Punjab & Haryana High Court'],
    specializations: ['Family Law', 'Matrimonial Law'],
    yearsOfExperience: 11,
    consultationFee: 2000,
    languages: ['English', 'Hindi'],
    rating: 4.6,
    reviewCount: 47,
    totalConsultations: 210,
    bio: 'Matrimonial lawyer specialising in divorce settlements, custody, and alimony negotiations.',
  },
  {
    name: 'Mohit Chawla',
    email: 'lawyer19@example.com',
    phone: '+919000000019',
    city: 'Chandigarh',
    courtsPracticed: ['Punjab & Haryana High Court'],
    specializations: ['Property Law', 'Civil Law'],
    yearsOfExperience: 15,
    consultationFee: 1600,
    languages: ['English', 'Hindi', 'Punjabi'],
    rating: 4.4,
    reviewCount: 66,
    totalConsultations: 240,
    bio: 'Property and civil lawyer handling partition suits, tenancy disputes, and land records correction.',
  },
  {
    name: 'Tanvi Shah',
    email: 'lawyer20@example.com',
    phone: '+919000000020',
    city: 'Ahmedabad',
    courtsPracticed: ['Gujarat High Court'],
    specializations: ['Tax Law'],
    yearsOfExperience: 13,
    consultationFee: 2700,
    languages: ['English', 'Gujarati', 'Hindi'],
    rating: 4.7,
    reviewCount: 38,
    totalConsultations: 160,
    bio: 'Tax lawyer focusing on income tax assessments, appeals, and GST compliance for small businesses.',
  },
  {
    name: 'Gaurav Kulkarni',
    email: 'lawyer21@example.com',
    phone: '+919000000021',
    city: 'Pune',
    courtsPracticed: ['Bombay High Court'],
    specializations: ['Banking & Finance', 'Corporate Law'],
    yearsOfExperience: 17,
    consultationFee: 3100,
    languages: ['English', 'Marathi', 'Hindi'],
    rating: 4.6,
    reviewCount: 57,
    totalConsultations: 200,
    bio: 'Banking and finance lawyer representing borrowers and lenders in loan recovery and insolvency matters.',
  },
  {
    name: 'Ishita Bose',
    email: 'lawyer22@example.com',
    phone: '+919000000022',
    city: 'Kolkata',
    courtsPracticed: ['Calcutta High Court'],
    specializations: ['Civil Law', 'Consumer Protection'],
    yearsOfExperience: 10,
    consultationFee: 1800,
    languages: ['English', 'Hindi', 'Bengali'],
    rating: 4.2,
    reviewCount: 36,
    totalConsultations: 170,
    bio: 'Civil lawyer handling breach of contract, landlord-tenant, and consumer disputes.',
  },
  {
    name: 'Nikhil Pillai',
    email: 'lawyer23@example.com',
    phone: '+919000000023',
    city: 'Mumbai',
    courtsPracticed: ['Bombay High Court'],
    specializations: ['Intellectual Property', 'Cyber Law'],
    yearsOfExperience: 8,
    consultationFee: 2900,
    languages: ['English', 'Hindi'],
    rating: 4.3,
    reviewCount: 26,
    totalConsultations: 110,
    bio: 'IP and technology lawyer supporting founders on patents, trademarks, software licensing, and privacy.',
  },
  {
    name: 'Anjali Mishra',
    email: 'lawyer24@example.com',
    phone: '+919000000024',
    city: 'Bhopal',
    courtsPracticed: ['Madhya Pradesh High Court'],
    specializations: ['Labour Law', 'Employment Law'],
    yearsOfExperience: 12,
    consultationFee: 1500,
    languages: ['English', 'Hindi'],
    rating: 4.4,
    reviewCount: 43,
    totalConsultations: 185,
    bio: 'Labour lawyer representing workers in industrial disputes, gratuity, and provident fund claims.',
  },
  {
    name: 'Varun Sethi',
    email: 'lawyer25@example.com',
    phone: '+919000000025',
    city: 'Delhi',
    courtsPracticed: ['Delhi High Court'],
    specializations: ['Real Estate', 'Property Law'],
    yearsOfExperience: 14,
    consultationFee: 2500,
    languages: ['English', 'Hindi'],
    rating: 4.5,
    reviewCount: 59,
    totalConsultations: 225,
    bio: 'Real estate lawyer specialising in builder-buyer disputes, RERA complaints, and joint development agreements.',
  },
];

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const seed of seedLawyers.slice(0, COUNT)) {
    try {
      const exists = await User.findOne({ $or: [{ email: seed.email }, { phone: seed.phone }] });
      if (exists) {
        skipped += 1;
        console.log(`skip  ${seed.email}`);
        continue;
      }

      const user = await User.create({
        role: 'lawyer',
        name: seed.name,
        email: seed.email,
        phone: seed.phone,
        passwordHash,
        isEmailVerified: true,
        isPhoneVerified: true,
      });

      await Lawyer.create({
        userId: user._id,
        specialization: seed.specializations,
        yearsOfExperience: seed.yearsOfExperience,
        courtsPracticed: seed.courtsPracticed,
        languages: seed.languages,
        consultationFee: seed.consultationFee,
        bio: seed.bio,
        officeAddress: seed.city,
        verificationStatus: 'approved',
        isProfileVisible: true,
        rating: seed.rating,
        reviewCount: seed.reviewCount,
        totalConsultations: seed.totalConsultations,
      });

      created += 1;
      console.log(`create ${seed.email}`);
    } catch (err) {
      errors.push(`${seed.email}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
  if (errors.length) {
    console.error(`\n${errors.length} failed:`);
    for (const error of errors) console.error('  ' + error);
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
