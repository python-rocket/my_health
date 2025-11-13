import os
import logging
from typing import Optional, Dict
import pandas as pd
from modules.youtube_summarizer.src.utils.psql_client import PSQLClient

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TestingResultsUnitConverter:
    """
    Converts units within the same category for testing results.
    Only converts units where can_convert flag is True in the database.
    """
    
    def __init__(self, connection_string: Optional[str] = None):
        """
        Initialize the converter with database connection.
        
        Args:
            connection_string: PostgreSQL connection string. If None, uses PSQL_CONNECTION_STRING env var.
        """
        if connection_string is None:
            connection_string = os.getenv("PSQL_CONNECTION_STRING")
        
        if not connection_string:
            raise ValueError("Connection string is required. Set PSQL_CONNECTION_STRING env var or pass connection_string.")
        
        self.psql_client = PSQLClient(connection_string)
        self._units_cache = None
        self._load_units()
    
    def _load_units(self):
        """Load units from database and cache them."""
        try:
            query = "SELECT category, unit, can_convert FROM testing_results_units"
            df = self.psql_client.read_sql_query(query)
            self._units_cache = df
            logger.info(f"Loaded {len(df)} units from database")
        except Exception as e:
            logger.error(f"Error loading units from database: {e}")
            self._units_cache = pd.DataFrame()
    
    def _can_convert(self, category: str, unit: str) -> bool:
        """
        Check if a unit can be converted based on can_convert flag.
        
        Args:
            category: Unit category
            unit: Unit name
            
        Returns:
            True if unit can be converted, False otherwise
        """
        if self._units_cache is None or self._units_cache.empty:
            logger.warning("Units cache is empty, cannot check can_convert flag")
            return False
        
        mask = (self._units_cache['category'] == category) & (self._units_cache['unit'] == unit)
        matching_rows = self._units_cache[mask]
        
        if matching_rows.empty:
            logger.warning(f"Unit '{unit}' not found in category '{category}'")
            return False
        
        can_convert = matching_rows.iloc[0]['can_convert']
        return bool(can_convert)
    
    def convert(self, unit_category: str, unit: str, unit_destination: str, value: float) -> Optional[float]:
        """
        Convert a value from one unit to another within the same category.
        
        Args:
            unit_category: Category of the units (e.g., "Mass Concentration")
            unit: Source unit (e.g., "mg/L")
            unit_destination: Destination unit (e.g., "mg/mL")
            value: Value to convert
            
        Returns:
            Converted value or None if conversion is not possible
        """
        try:
            # Check if both units can be converted
            if not self._can_convert(unit_category, unit):
                logger.warning(f"Unit '{unit}' in category '{unit_category}' cannot be converted (can_convert=False)")
                return None
            
            if not self._can_convert(unit_category, unit_destination):
                logger.warning(f"Unit '{unit_destination}' in category '{unit_category}' cannot be converted (can_convert=False)")
                return None
            
            # Route to appropriate conversion function based on category
            conversion_map = {
                "Mass": self._convert_mass,
                "Mass Concentration": self._convert_mass_concentration,
                "Molar Concentration": self._convert_molar_concentration,
                "Enzyme Activity": self._convert_enzyme_activity,
                "Cell Count": self._convert_cell_count,
                "Volume": self._convert_volume,
                "Stool Test Units": self._convert_stool_test_units,
                "Other": self._convert_other,
            }
            
            if unit_category not in conversion_map:
                logger.warning(f"Category '{unit_category}' is not supported for conversion")
                return None
            
            converter_func = conversion_map[unit_category]
            result = converter_func(unit, unit_destination, value)
            
            if result is None:
                logger.warning(f"Conversion from '{unit}' to '{unit_destination}' in category '{unit_category}' failed")
            
            return result
            
        except Exception as e:
            logger.error(f"Error during conversion: {e}", exc_info=True)
            return None
    
    def _convert_mass(self, unit: str, unit_destination: str, value: float) -> Optional[float]:
        """Convert mass units (mg, g, µg, ng, pg, fg)."""
        # Convert to base unit (grams)
        mass_multipliers = {
            'fg': 1e-15,
            'pg': 1e-12,
            'ng': 1e-9,
            'µg': 1e-6,
            'mg': 1e-3,
            'g': 1.0,
        }
        
        if unit not in mass_multipliers or unit_destination not in mass_multipliers:
            logger.warning(f"Unsupported mass unit: {unit} or {unit_destination}")
            return None
        
        # Convert to grams, then to destination
        value_in_grams = value * mass_multipliers[unit]
        result = value_in_grams / mass_multipliers[unit_destination]
        return result
    
    def _convert_mass_concentration(self, unit: str, unit_destination: str, value: float) -> Optional[float]:
        """Convert mass concentration units (mg/L, mg/dL, mg/mL, etc.)."""
        # Parse unit into mass part and volume part
        def parse_mass_concentration(unit_str: str):
            """Parse unit like 'mg/L' into ('mg', 'L') or 'µg/mL' into ('µg', 'mL')."""
            # Handle common separators
            for sep in ['/', ' per ']:
                if sep in unit_str:
                    parts = unit_str.split(sep, 1)
                    if len(parts) == 2:
                        return parts[0].strip(), parts[1].strip()
            return None, None
        
        mass_part_src, volume_part_src = parse_mass_concentration(unit)
        mass_part_dest, volume_part_dest = parse_mass_concentration(unit_destination)
        
        if not mass_part_src or not mass_part_dest or not volume_part_src or not volume_part_dest:
            logger.warning(f"Could not parse mass concentration units: {unit} or {unit_destination}")
            return None
        
        # Mass multipliers
        mass_multipliers = {
            'fg': 1e-15,
            'pg': 1e-12,
            'ng': 1e-9,
            'µg': 1e-6,
            'mg': 1e-3,
            'g': 1.0,
        }
        
        # Volume multipliers (to liters)
        volume_multipliers = {
            'nL': 1e-9,
            'µL': 1e-6,
            'mL': 1e-3,
            'dL': 0.1,
            'L': 1.0,
            'g': 1.0,  # For mg/g, treat g as reference (no conversion needed)
            'kg': 1000.0,
        }
        
        if mass_part_src not in mass_multipliers or mass_part_dest not in mass_multipliers:
            logger.warning(f"Unsupported mass part in unit: {mass_part_src} or {mass_part_dest}")
            return None
        
        if volume_part_src not in volume_multipliers or volume_part_dest not in volume_multipliers:
            logger.warning(f"Unsupported volume part in unit: {volume_part_src} or {volume_part_dest}")
            return None
        
        # Convert to base: mg/L
        # First convert mass part to mg, volume part to L
        value_in_mg_per_L = value * (mass_multipliers[mass_part_src] / mass_multipliers['mg']) / (volume_multipliers[volume_part_src] / volume_multipliers['L'])
        
        # Convert from mg/L to destination
        result = value_in_mg_per_L * (mass_multipliers['mg'] / mass_multipliers[mass_part_dest]) * (volume_multipliers['L'] / volume_multipliers[volume_part_dest])
        
        return result
    
    def _convert_molar_concentration(self, unit: str, unit_destination: str, value: float) -> Optional[float]:
        """Convert molar concentration units (mmol/L, µmol/L, nmol/L, pmol/L)."""
        # Parse unit into molar part and volume part
        def parse_molar_concentration(unit_str: str):
            """Parse unit like 'mmol/L' into ('mmol', 'L')."""
            for sep in ['/', ' per ']:
                if sep in unit_str:
                    parts = unit_str.split(sep, 1)
                    if len(parts) == 2:
                        return parts[0].strip(), parts[1].strip()
            return None, None
        
        molar_part_src, volume_part_src = parse_molar_concentration(unit)
        molar_part_dest, volume_part_dest = parse_molar_concentration(unit_destination)
        
        if not molar_part_src or not molar_part_dest or not volume_part_src or not volume_part_dest:
            logger.warning(f"Could not parse molar concentration units: {unit} or {unit_destination}")
            return None
        
        # Molar multipliers (to mol)
        molar_multipliers = {
            'pmol': 1e-12,
            'nmol': 1e-9,
            'µmol': 1e-6,
            'mmol': 1e-3,
            'mol': 1.0,
        }
        
        # Volume multipliers (to liters)
        volume_multipliers = {
            'nL': 1e-9,
            'µL': 1e-6,
            'mL': 1e-3,
            'dL': 0.1,
            'L': 1.0,
        }
        
        if molar_part_src not in molar_multipliers or molar_part_dest not in molar_multipliers:
            logger.warning(f"Unsupported molar part in unit: {molar_part_src} or {molar_part_dest}")
            return None
        
        if volume_part_src not in volume_multipliers or volume_part_dest not in volume_multipliers:
            logger.warning(f"Unsupported volume part in unit: {volume_part_src} or {volume_part_dest}")
            return None
        
        # Convert to base: mol/L
        value_in_mol_per_L = value * (molar_multipliers[molar_part_src] / molar_multipliers['mol']) / (volume_multipliers[volume_part_src] / volume_multipliers['L'])
        
        # Convert from mol/L to destination
        result = value_in_mol_per_L * (molar_multipliers['mol'] / molar_multipliers[molar_part_dest]) * (volume_multipliers['L'] / volume_multipliers[volume_part_dest])
        
        return result
    
    def _convert_enzyme_activity(self, unit: str, unit_destination: str, value: float) -> Optional[float]:
        """Convert enzyme activity units (U/L, U/g, kU/L, mU/mL, µkat/L)."""
        # Parse unit
        def parse_enzyme_activity(unit_str: str):
            """Parse unit like 'U/L' into ('U', 'L') or 'µkat/L' into ('µkat', 'L')."""
            for sep in ['/', ' per ']:
                if sep in unit_str:
                    parts = unit_str.split(sep, 1)
                    if len(parts) == 2:
                        return parts[0].strip(), parts[1].strip()
            return None, None
        
        activity_part_src, volume_part_src = parse_enzyme_activity(unit)
        activity_part_dest, volume_part_dest = parse_enzyme_activity(unit_destination)
        
        if not activity_part_src or not activity_part_dest or not volume_part_src or not volume_part_dest:
            logger.warning(f"Could not parse enzyme activity units: {unit} or {unit_destination}")
            return None
        
        # Activity multipliers (to U)
        # 1 kat = 16.67 U (approximately), so 1 µkat = 0.01667 U
        activity_multipliers = {
            'µkat': 0.01667,
            'mU': 0.001,
            'U': 1.0,
            'kU': 1000.0,
        }
        
        # Volume/mass multipliers
        volume_multipliers = {
            'nL': 1e-9,
            'µL': 1e-6,
            'mL': 1e-3,
            'dL': 0.1,
            'L': 1.0,
            'g': 1.0,  # For U/g
        }
        
        if activity_part_src not in activity_multipliers or activity_part_dest not in activity_multipliers:
            logger.warning(f"Unsupported activity part in unit: {activity_part_src} or {activity_part_dest}")
            return None
        
        if volume_part_src not in volume_multipliers or volume_part_dest not in volume_multipliers:
            logger.warning(f"Unsupported volume/mass part in unit: {volume_part_src} or {volume_part_dest}")
            return None
        
        # Convert to base: U/L
        value_in_U_per_L = value * (activity_multipliers[activity_part_src] / activity_multipliers['U']) / (volume_multipliers[volume_part_src] / volume_multipliers['L'])
        
        # Convert from U/L to destination
        result = value_in_U_per_L * (activity_multipliers['U'] / activity_multipliers[activity_part_dest]) * (volume_multipliers['L'] / volume_multipliers[volume_part_dest])
        
        return result
    
    def _convert_cell_count(self, unit: str, unit_destination: str, value: float) -> Optional[float]:
        """Convert cell count units (10^9/L, 10^12/L, 10^6/µL, 10^3/µL)."""
        # Parse unit like "10^9/L" into (9, 'L')
        def parse_cell_count(unit_str: str):
            """Parse unit like '10^9/L' into (9, 'L')."""
            if '10^' in unit_str:
                parts = unit_str.split('10^', 1)
                if len(parts) == 2:
                    exponent_and_volume = parts[1]
                    for sep in ['/', ' per ']:
                        if sep in exponent_and_volume:
                            exp_part, volume_part = exponent_and_volume.split(sep, 1)
                            try:
                                exponent = int(exp_part.strip())
                                return exponent, volume_part.strip()
                            except ValueError:
                                pass
            return None, None
        
        exp_src, volume_src = parse_cell_count(unit)
        exp_dest, volume_dest = parse_cell_count(unit_destination)
        
        if exp_src is None or exp_dest is None or not volume_src or not volume_dest:
            logger.warning(f"Could not parse cell count units: {unit} or {unit_destination}")
            return None
        
        # Volume multipliers (to liters)
        volume_multipliers = {
            'µL': 1e-6,
            'mL': 1e-3,
            'L': 1.0,
        }
        
        if volume_src not in volume_multipliers or volume_dest not in volume_multipliers:
            logger.warning(f"Unsupported volume part in cell count unit: {volume_src} or {volume_dest}")
            return None
        
        # Convert to base: cells/L (using 10^9/L as reference)
        # First convert to cells/L
        value_in_cells_per_L = value * (10 ** exp_src) / volume_multipliers[volume_src]
        
        # Convert from cells/L to destination
        result = value_in_cells_per_L * volume_multipliers[volume_dest] / (10 ** exp_dest)
        
        return result
    
    def _convert_volume(self, unit: str, unit_destination: str, value: float) -> Optional[float]:
        """Convert volume units (mL, L, fL, pL, nL)."""
        volume_multipliers = {
            'fL': 1e-15,
            'pL': 1e-12,
            'nL': 1e-9,
            'µL': 1e-6,
            'mL': 1e-3,
            'L': 1.0,
        }
        
        if unit not in volume_multipliers or unit_destination not in volume_multipliers:
            logger.warning(f"Unsupported volume unit: {unit} or {unit_destination}")
            return None
        
        # Convert to liters, then to destination
        value_in_liters = value * volume_multipliers[unit]
        result = value_in_liters / volume_multipliers[unit_destination]
        return result
    
    def _convert_stool_test_units(self, unit: str, unit_destination: str, value: float) -> Optional[float]:
        """Convert stool test units (CFU/g, CFU/mL)."""
        # Parse unit like "CFU/g" into ('CFU', 'g')
        def parse_stool_unit(unit_str: str):
            """Parse unit like 'CFU/g' into ('CFU', 'g')."""
            for sep in ['/', ' per ']:
                if sep in unit_str:
                    parts = unit_str.split(sep, 1)
                    if len(parts) == 2:
                        return parts[0].strip(), parts[1].strip()
            return None, None
        
        count_part_src, mass_volume_src = parse_stool_unit(unit)
        count_part_dest, mass_volume_dest = parse_stool_unit(unit_destination)
        
        if not count_part_src or not count_part_dest or not mass_volume_src or not mass_volume_dest:
            logger.warning(f"Could not parse stool test units: {unit} or {unit_destination}")
            return None
        
        # Mass/volume multipliers (to grams for consistency)
        mass_volume_multipliers = {
            'mg': 1e-3,
            'g': 1.0,
            'kg': 1000.0,
            'µL': 1e-6,  # Treating as equivalent to g for density approximation
            'mL': 1e-3,  # Treating as equivalent to g for density approximation
            'L': 1.0,    # Treating as equivalent to kg for density approximation
        }
        
        if count_part_src != count_part_dest:
            logger.warning(f"Count parts must match for stool test units: {count_part_src} != {count_part_dest}")
            return None
        
        if mass_volume_src not in mass_volume_multipliers or mass_volume_dest not in mass_volume_multipliers:
            logger.warning(f"Unsupported mass/volume part in stool test unit: {mass_volume_src} or {mass_volume_dest}")
            return None
        
        # Convert to base: CFU/g
        value_in_CFU_per_g = value / mass_volume_multipliers[mass_volume_src]
        
        # Convert from CFU/g to destination
        result = value_in_CFU_per_g * mass_volume_multipliers[mass_volume_dest]
        
        return result
    
    def _convert_other(self, unit: str, unit_destination: str, value: float) -> Optional[float]:
        """Convert other units (U/mL, kPa, mmHg)."""
        # Handle pressure units
        if unit == 'kPa' and unit_destination == 'mmHg':
            # 1 kPa = 7.50062 mmHg
            return value * 7.50062
        elif unit == 'mmHg' and unit_destination == 'kPa':
            # 1 mmHg = 0.133322 kPa
            return value * 0.133322
        
        # Handle U/mL (enzyme activity-like)
        if '/mL' in unit and '/mL' in unit_destination:
            # Both are per mL, just check if the activity part matches
            activity_src = unit.replace('/mL', '').strip()
            activity_dest = unit_destination.replace('/mL', '').strip()
            
            if activity_src == activity_dest:
                return value  # Same unit
            elif activity_src == 'U' and activity_dest == 'U':
                return value  # Same unit
            else:
                logger.warning(f"Unsupported other unit conversion: {unit} to {unit_destination}")
                return None
        
        logger.warning(f"Unsupported other unit conversion: {unit} to {unit_destination}")
        return None

